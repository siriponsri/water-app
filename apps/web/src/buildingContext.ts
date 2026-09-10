import type { Domain } from './appData';

export type BuildingContextValue = '' | 'Building 10' | 'Building 12' | 'Building 16' | 'Other';
export type BuildingContext = Record<Domain, BuildingContextValue>;

const STORAGE_KEY = 'anf3.building-context.v1';
export const BUILDING_CONTEXT_EVENT = 'anf3:building-context';
const EMPTY: BuildingContext = { water: '', air: '', cv: '' };
const ALLOWED = new Set<BuildingContextValue>(['', 'Building 10', 'Building 12', 'Building 16', 'Other']);

function clean(value: unknown): BuildingContextValue {
  const normalized = String(value || '').trim();
  return ALLOWED.has(normalized as BuildingContextValue) ? normalized as BuildingContextValue : '';
}

export function readBuildingContext(): BuildingContext {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<BuildingContext>;
    return {
      water: clean(parsed.water),
      air: clean(parsed.air),
      cv: clean(parsed.cv)
    };
  } catch {
    return { ...EMPTY };
  }
}

export function readBuilding(domain: Domain) {
  return readBuildingContext()[domain];
}

export function setBuilding(domain: Domain, value: unknown) {
  const next = { ...readBuildingContext(), [domain]: clean(value) } as BuildingContext;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* A locked-down browser keeps the selection in the current route. */
  }
  window.dispatchEvent(new CustomEvent(BUILDING_CONTEXT_EVENT, { detail: next }));
  return next;
}

export const buildingChoices: { value: BuildingContextValue; label: string }[] = [
  { value: '', label: 'All Buildings' },
  { value: 'Building 10', label: 'Building 10' },
  { value: 'Building 12', label: 'Building 12' },
  { value: 'Building 16', label: 'Building 16' },
  { value: 'Other', label: 'Other Locations' }
];
