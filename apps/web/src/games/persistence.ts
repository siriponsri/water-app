import { useEffect, useState } from 'react';
import type { EvidencePacket, GameDifficulty, GameRole, StoredGameProfile } from './types';

export const GAMES_DB_NAME = 'anf3-games-v2';
export const GAMES_DB_VERSION = 2;
const STATE_STORE = 'states';
const PACKET_STORE = 'packets';
const PROFILE_STORE = 'profiles';
const LEGACY_PREFIX = 'anf3.games.';
const STORAGE_MIGRATION_KEY = `${GAMES_DB_NAME}:storage-migration`;
const LEGACY_STATE_KEYS = {
  culturecheck: 'anf3.games.culturecheck.v1',
  sixthplate: 'anf3.games.sixthplate.v1'
} as const;
const VALID_PHASES = new Set(['campaign', 'orientation', 'briefing', 'intake', 'planning', 'incubation', 'observation', 'interpretation', 'debrief', 'hypotheses', 'evidence', 'conclusion']);
const VALID_DIFFICULTIES = new Set(['guided', 'standard', 'expert']);
const VALID_ROLES = new Set(['learner', 'instructor']);

type StoredState = { key: string; updatedAt: string; value: unknown };

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) return Promise.resolve(null);
  return new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(GAMES_DB_NAME, GAMES_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STATE_STORE)) database.createObjectStore(STATE_STORE, { keyPath: 'key' });
      if (!database.objectStoreNames.contains(PACKET_STORE)) database.createObjectStore(PACKET_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(PROFILE_STORE)) database.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB could not be opened'));
  }).catch(() => null);
}

async function getStoredState<T>(key: string): Promise<StoredState & { value: T } | null> {
  const database = await openDatabase();
  if (!database) {
    try { const raw = localStorage.getItem(`${GAMES_DB_NAME}:state:${key}`); return raw ? JSON.parse(raw) as StoredState & { value: T } : null; } catch { return null; }
  }
  return new Promise((resolve) => {
    const request = database.transaction(STATE_STORE, 'readonly').objectStore(STATE_STORE).get(key);
    request.onsuccess = () => resolve((request.result as StoredState & { value: T }) || null);
    request.onerror = () => resolve(null);
  });
}

async function putStoredState(key: string, value: unknown) {
  const database = await openDatabase();
  if (!database) {
    try { localStorage.setItem(`${GAMES_DB_NAME}:state:${key}`, JSON.stringify({ key, value, updatedAt: new Date().toISOString() } satisfies StoredState)); return true; } catch { return false; }
  }
  return new Promise<boolean>((resolve) => {
    const request = database.transaction(STATE_STORE, 'readwrite').objectStore(STATE_STORE).put({ key, value, updatedAt: new Date().toISOString() } satisfies StoredState);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
}

async function deleteStoredState(key: string) {
  const database = await openDatabase();
  if (!database) { try { localStorage.removeItem(`${GAMES_DB_NAME}:state:${key}`); } catch { /* no-op */ } return; }
  database.transaction(STATE_STORE, 'readwrite').objectStore(STATE_STORE).delete(key);
}

function readLegacy<T>(key: string, initial: T) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : initial;
  } catch {
    return initial;
  }
}

function normaliseLegacyState<T>(value: unknown, initial: T): T {
  if (!value || typeof value !== 'object' || !initial || typeof initial !== 'object') return initial;
  const source = value as Record<string, unknown>;
  const defaults = initial as Record<string, unknown>;
  const result: Record<string, unknown> = { ...defaults };
  for (const [field, fallback] of Object.entries(defaults)) {
    const candidate = source[field];
    if (candidate === undefined) continue;
    if (field === 'phase' && (typeof candidate !== 'string' || !VALID_PHASES.has(candidate))) continue;
    if (field === 'difficulty' && (typeof candidate !== 'string' || !VALID_DIFFICULTIES.has(candidate))) continue;
    if (field === 'role' && (typeof candidate !== 'string' || !VALID_ROLES.has(candidate))) continue;
    if (Array.isArray(fallback) && !Array.isArray(candidate)) continue;
    if (typeof fallback === 'boolean' && typeof candidate !== 'boolean') continue;
    if (typeof fallback === 'string' && typeof candidate !== 'string') continue;
    if (typeof fallback === 'number' && (typeof candidate !== 'number' || !Number.isFinite(candidate))) continue;
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback) && (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate))) continue;
    result[field] = candidate;
  }
  return result as T;
}

function migrateLegacyState<T>(key: string, initial: T) {
  const current = readLegacy<T>(key, initial);
  if (current !== initial || typeof localStorage === 'undefined') return current;
  const game = key.includes('culturecheck') ? 'culturecheck' : key.includes('sixthplate') ? 'sixthplate' : undefined;
  if (!game) return current;
  const legacyKey = LEGACY_STATE_KEYS[game];
  const legacy = readLegacy<unknown | null>(legacyKey, null);
  if (!legacy || typeof legacy !== 'object') return current;
  const normalised = normaliseLegacyState(legacy, initial);
  try {
    localStorage.setItem(key, JSON.stringify(normalised));
    localStorage.setItem(`${STORAGE_MIGRATION_KEY}:${game}`, new Date().toISOString());
    return normalised;
  } catch {
    return current;
  }
}

/**
 * Immediate local state keeps the form responsive. Every committed render is
 * mirrored into IndexedDB; the existing v1 localStorage key is migrated on
 * first open so an interrupted learner run can be resumed offline.
 */
export function useLocalGameState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => migrateLegacyState(key, initial));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredState<T>(key);
      if (!cancelled && stored?.value !== undefined) setValue(stored.value);
      if (!stored) await putStoredState(key, migrateLegacyState(key, initial));
      if (!cancelled) setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [initial, key]);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable in private contexts. */ }
    if (!hydrated) return;
    void putStoredState(key, value);
  }, [hydrated, key, value]);

  const reset = () => {
    try { localStorage.removeItem(key); } catch { /* no-op */ }
    void deleteStoredState(key);
    setValue(initial);
  };
  return [value, setValue, reset, hydrated] as const;
}

export function audit(action: string, detail: string, source: 'learner' | 'system' = 'learner') {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), action, detail, source };
}

export function downloadEvidence(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function packetId() {
  return `packet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveEvidencePacket(packet: EvidencePacket) {
  const id = packet.id || packetId();
  const value = { ...packet, id };
  const database = await openDatabase();
  if (database) await new Promise<void>((resolve) => {
    const request = database.transaction(PACKET_STORE, 'readwrite').objectStore(PACKET_STORE).put(value);
    request.onsuccess = () => resolve(); request.onerror = () => resolve();
  });
  try { localStorage.setItem(`${GAMES_DB_NAME}:packet:${id}`, JSON.stringify(value)); } catch { /* IndexedDB remains the primary store. */ }
  return value;
}

export async function getEvidencePacket(id: string) {
  const database = await openDatabase();
  if (!database) return readPacketFallback(id);
  return new Promise<EvidencePacket | null>((resolve) => {
    const request = database.transaction(PACKET_STORE, 'readonly').objectStore(PACKET_STORE).get(id);
    request.onsuccess = () => resolve((request.result as EvidencePacket) || readPacketFallback(id));
    request.onerror = () => resolve(readPacketFallback(id));
  });
}

function readPacketFallback(id: string) {
  try { const raw = localStorage.getItem(`${GAMES_DB_NAME}:packet:${id}`); return raw ? JSON.parse(raw) as EvidencePacket : null; } catch { return null; }
}

export function exportPacket(packet: EvidencePacket, filename: string) {
  const saved = { ...packet, id: packet.id || packetId(), exportedAt: packet.exportedAt || new Date().toISOString() };
  void saveEvidencePacket(saved);
  downloadEvidence(filename, saved);
  return saved;
}

export function validateImportedProfile(value: unknown): value is StoredGameProfile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredGameProfile>;
  const required = new Set(['TSB', 'SDA', 'MSA', 'MAC', 'RV', 'XLD']);
  return typeof candidate.id === 'string' && candidate.id.length >= 3
    && typeof candidate.displayName === 'string' && candidate.displayName.length >= 3
    && candidate.educationalOnly === true && typeof candidate.disclaimer === 'string' && candidate.disclaimer.length >= 20
    && Array.isArray(candidate.media) && candidate.media.length === 6
    && candidate.media.every((medium) => Boolean(medium) && required.delete(String(medium.id)) && (medium.form === 'broth' || medium.form === 'agar') && typeof medium.name === 'string' && typeof medium.role === 'string' && typeof medium.boundary === 'string')
    && required.size === 0;
}

export async function saveImportedProfile(profile: StoredGameProfile) {
  const database = await openDatabase();
  if (!database) {
    try {
      localStorage.setItem(`${GAMES_DB_NAME}:profile:${profile.id}`, JSON.stringify(profile));
      return true;
    } catch {
      return false;
    }
  }
  return new Promise<boolean>((resolve) => {
    const request = database.transaction(PROFILE_STORE, 'readwrite').objectStore(PROFILE_STORE).put(profile);
    request.onsuccess = () => resolve(true); request.onerror = () => resolve(false);
  });
}


