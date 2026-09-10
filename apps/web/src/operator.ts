/* =========================================================================
   Who is at this machine
   -------------------------------------------------------------------------
   QA asked two questions this workspace can answer: who printed a controlled
   document, and who used the workspace at all. Both need a name against the
   action, so the operator gives their name and employee code once per
   machine and the workspace remembers it until somebody clears it.

   Why a name AND a code. The System DB's own `createdBy` column is the
   cautionary tale: across 212 rows of records_pw_prw it holds `na` 44 times,
   `KC`/`kc` 25 times, `kulwanee`/`Kulwanee` 17, `วิทยา`, `Siripon`, `คนสวย`,
   and 12 blanks — free text, no code anywhere, so "who made this record"
   cannot be answered from it however the data is displayed. A code makes an
   entry match a person; a name makes the log readable without a lookup
   table. Storing both is what stops this log going the same way.

   Be precise about what this is. Nothing verifies either field, so it is
   ATTRIBUTION, not AUTHENTICATION — it records who said they were at the
   machine, exactly as a paper issue logbook does. It is not a 21 CFR Part 11
   electronic signature, it does not restrict access, and it must never be
   presented as either. Every surface that shows it says so.

   The identity is kept in this browser only. The log entries themselves are
   written by the local server, with the server's own clock, because a
   timestamp the page could set would be worth nothing as evidence.
   ========================================================================= */

const STORAGE_KEY = 'anf3.operator.v2';
/** v1 held a bare code string. Installs already carrying one are migrated. */
const LEGACY_KEY = 'anf3.operator.v1';
export const OPERATOR_EVENT = 'anf3:operator';

export type Operator = { name: string; code: string };

const EMPTY: Operator = { name: '', code: '' };

function clean(value: unknown, limit: number) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function readOperator(): Operator {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const stored = { name: clean(parsed?.name, 60), code: clean(parsed?.code, 40) };
      if (stored.name || stored.code) return stored;
    }
    /* An install from before names were asked for: keep the code, and let the
       gate collect the name rather than throwing the code away. */
    const legacy = clean(localStorage.getItem(LEGACY_KEY), 40);
    if (legacy) return { name: '', code: legacy };
  } catch { /* fall through to the session copy */ }
  return memory.name || memory.code ? memory : EMPTY;
}

/**
 * Held in memory as well as in the browser store.
 *
 * Without this, a machine whose storage is blocked — a locked-down profile,
 * private browsing, site data disabled by policy — could never get past the
 * gate at all: the write failed silently, the gate re-read an empty value,
 * and the same form came back forever with nothing to explain why. The
 * session copy keeps that machine working for as long as the tab is open;
 * it simply has to be entered again next time.
 */
let memory: Operator = { name: '', code: '' };

export function setOperator(operator: Operator) {
  const next: Operator = { name: clean(operator.name, 60), code: clean(operator.code, 40) };
  memory = next;
  try {
    if (next.name || next.code) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* a disabled store must never block the workspace */ }
  window.dispatchEvent(new CustomEvent(OPERATOR_EVENT));
}

/** True when the browser will not keep the identity between sessions. */
export function storageIsUnavailable() {
  try {
    const probe = '__anf3_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return false;
  } catch {
    return true;
  }
}

/** The "ลบข้อมูลเครื่องนี้" button. Forgets the person, not their log entries. */
export function clearOperator() {
  memory = { name: '', code: '' };
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* nothing to do */ }
  window.dispatchEvent(new CustomEvent(OPERATOR_EVENT));
}

/** Both fields are free-form, but each must be *something* stable. */
export function operatorLooksValid(operator: Operator) {
  return clean(operator.name, 60).length >= 2 && clean(operator.code, 40).length >= 2;
}

/**
 * One string for the log column and for the Google Sheet, in a shape a
 * person and a filter can both read: "สมชาย ใจดี (4417)".
 */
export function operatorLabel(operator: Operator) {
  if (!operator.name && !operator.code) return '';
  if (!operator.code) return operator.name;
  if (!operator.name) return operator.code;
  return `${operator.name} (${operator.code})`;
}

export type LogAction =
  | 'workspace_opened' | 'record_opened' | 'pdf_generated'
  | 'pdf_printed' | 'pdf_downloaded' | 'pdf_batch' | 'operator_changed';

/**
 * Reports one action to the local server, which stamps and stores it.
 * Never throws and never blocks: a log that cannot be written must not stop
 * somebody printing a worksheet they need.
 */
export async function logEvent(action: LogAction, detail?: { worksheetNo?: string; detail?: string }) {
  const operator = readOperator();
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        operator: operatorLabel(operator),
        operatorName: operator.name,
        operatorCode: operator.code,
        worksheetNo: detail?.worksheetNo || '',
        detail: detail?.detail || ''
      })
    });
  } catch { /* offline, or the server is not running — carry on */ }
}

export type LogEntry = {
  at: string; action: string; operator: string;
  operatorName?: string; operatorCode?: string;
  worksheetNo: string; detail: string; host: string;
};

export async function readLog(limit = 300): Promise<{ entries: LogEntry[]; forwarding: boolean }> {
  try {
    const response = await fetch(`/api/log?limit=${limit}`, { cache: 'no-store' });
    if (!response.ok) return { entries: [], forwarding: false };
    const payload = await response.json();
    return {
      entries: Array.isArray(payload.entries) ? payload.entries : [],
      forwarding: Boolean(payload.forwarding)
    };
  } catch { return { entries: [], forwarding: false }; }
}

export const LOG_ACTION_LABELS: Record<string, string> = {
  workspace_opened: 'เปิดเวิร์กสเปซ',
  record_opened: 'เปิดใบงาน',
  pdf_generated: 'สร้าง PDF',
  pdf_printed: 'สั่งพิมพ์',
  pdf_downloaded: 'ดาวน์โหลดไฟล์',
  pdf_batch: 'พิมพ์หลายใบ',
  operator_changed: 'เปลี่ยนผู้ใช้งาน'
};
