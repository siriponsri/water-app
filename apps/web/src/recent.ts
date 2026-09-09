/* What this browser opened last. Local to the machine, never synchronised,
 * never a record of anything — it is the in-tray on the desk, nothing more. */

export type RecentEntry = {
  key: string;
  title: string;
  detail: string;
  route: string;
  at: number;
};

const STORE = 'anf3.recent.v1';
const LIMIT = 8;

export function readRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((entry) => entry && entry.key && entry.route) : [];
  } catch {
    return [];
  }
}

export function noteRecent(entry: Omit<RecentEntry, 'at'>) {
  try {
    const next = [{ ...entry, at: Date.now() }, ...readRecent().filter((item) => item.key !== entry.key)].slice(0, LIMIT);
    localStorage.setItem(STORE, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('anf3:recent'));
  } catch {
    /* private mode, blocked storage — the in-tray simply stays empty */
  }
}

export function describeWhen(at: number) {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/* --------------------------------------------------------------------------
 * Reprint list for the known template substitution
 * --------------------------------------------------------------------------
 * While Rinse-PW with Membrane Filtration prints on the WFI/PUS form, every
 * document produced that way carries an acceptance criterion that is not its
 * own. When the sixth form is approved, whoever reprints needs to know exactly
 * which worksheets went out under the substitution — reconstructing that from
 * the System DB afterwards would mean re-deriving the routing for every rinse
 * record ever printed.
 *
 * This is a local list on the machine that printed, not a record: it is an
 * operator's aid, and the authoritative copy is the printed document itself.
 */
const SUBSTITUTION_KEY = 'anf3.substituted.v1';
const SUBSTITUTION_LIMIT = 500;

export type SubstitutionEntry = {
  worksheetNo: string;
  route: string;
  printedSpec: string;
  actualSpec: string;
  at: string;
};

export function readSubstitutions(): SubstitutionEntry[] {
  try {
    const raw = localStorage.getItem(SUBSTITUTION_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as SubstitutionEntry[]) : [];
  } catch { return []; }
}

export function noteSubstitution(entry: SubstitutionEntry) {
  try {
    const list = readSubstitutions().filter((item) => item.worksheetNo !== entry.worksheetNo);
    list.unshift(entry);
    localStorage.setItem(SUBSTITUTION_KEY, JSON.stringify(list.slice(0, SUBSTITUTION_LIMIT)));
    window.dispatchEvent(new CustomEvent('anf3:substituted'));
  } catch { /* a full or disabled store must never block printing */ }
}

/** CSV for the person who will reprint once the new form exists. */
export function substitutionCsv(): string {
  const rows = readSubstitutions();
  const head = 'worksheetNo,route,printedSpec,actualSpec,generatedAt';
  const body = rows.map((r) => [r.worksheetNo, r.route, r.printedSpec, r.actualSpec, r.at]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [head, ...body].join('\n');
}
