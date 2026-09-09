import type { Workflow } from './appData';
import type { RecordData } from './storage';

export type PdfAvailability = {
  enabled: boolean;
  reason: 'ready' | 'offline' | 'stale' | 'method-required' | 'unsupported';
};

function normalizeToken(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/[\s_.-]+/g, '');
}

export type CvSamplingFamily = 'contact-plate' | 'rinse' | 'unknown';
export type CvTestMethod = 'pour-plate' | 'membrane-filtration' | 'unknown';
export const CV_METHOD_CONTROL_ID = 'cv-method';

export function cvSamplingFamily(record: RecordData): CvSamplingFamily {
  const value = normalizeToken(record.samplingFamily || record.sampleMatrix || record.cvType);
  if (value.includes('CONTACTPLATE') || value === 'CONTACT') return 'contact-plate';
  if (value.includes('RINSE') || value === 'PWPRW' || value === 'WFIPUS' || value === 'POURPLATE' || value === 'MEMBRANEFILTRATION') return 'rinse';
  return 'unknown';
}

export function normalizeCvTestMethod(value: unknown): CvTestMethod {
  const token = normalizeToken(value);
  if (token.includes('POURPLATE') || token === 'POUR') return 'pour-plate';
  if (token.includes('MEMBRANEFILTRATION') || token === 'MEMBRANE' || token === 'MEMBFILTRATION') return 'membrane-filtration';
  return 'unknown';
}

export function isRinseRecord(record: RecordData) {
  return cvSamplingFamily(record) === 'rinse';
}

export function pdfRouteForRecord(workflow: Workflow, record: RecordData, selectedMethod?: string) {
  if (workflow.id !== 'cv') return workflow.pdfWorkflow;
  const family = cvSamplingFamily(record);
  if (family === 'contact-plate') return 'cleaning-validation-contact' as const;
  if (family !== 'rinse') return null;
  const method = normalizeCvTestMethod(selectedMethod || record.testMethod || record.samplingMethod);
  if (method === 'pour-plate') return 'cleaning-validation-rinse-pour' as const;
  if (method === 'membrane-filtration') return 'cleaning-validation-rinse-membrane' as const;
  return null;
}

export function pdfAvailability(workflow: Workflow, record: RecordData, fresh: boolean, online: boolean, selectedMethod?: string): PdfAvailability {
  if (!online) return { enabled: false, reason: 'offline' };
  if (!fresh) return { enabled: false, reason: 'stale' };
  if (workflow.pdfPolicy === 'none') return { enabled: false, reason: 'unsupported' };
  if (workflow.id === 'cv' && cvSamplingFamily(record) === 'rinse' && !pdfRouteForRecord(workflow, record, selectedMethod)) return { enabled: false, reason: 'method-required' };
  if (!pdfRouteForRecord(workflow, record, selectedMethod)) return { enabled: false, reason: 'unsupported' };
  return { enabled: true, reason: 'ready' };
}

export function catalogIndexUsable(status: { indexAvailable?: boolean; hashMatches?: boolean }) {
  return status.indexAvailable === true && status.hashMatches !== false;
}

/* --------------------------------------------------------------------------
 * Known template substitution — Rinse-PW rendered on the WFI form
 * --------------------------------------------------------------------------
 * The controlled forms differ by test method, not by water matrix, because the
 * table shape follows the method: Pour Plate prints two plate counts and an
 * average, Membrane Filtration prints a single value. There are therefore only
 * two rinse forms, and three combinations that occur in the real data:
 *
 *   Rinse-PW  + Pour Plate           -> pw-prw form      matrix and spec match
 *   Rinse-WFI + Membrane Filtration  -> wfi-pus form     matrix and spec match
 *   Rinse-PW  + Membrane Filtration  -> wfi-pus form     SHAPE matches, SPEC DOES NOT
 *
 * The third has no approved form of its own yet. The acceptance criterion is
 * printed inside the form artwork, so the document it produces carries the WFI
 * limit (10 cfu/100 mL) for a PW sample whose limit is 100 cfu/mL.
 *
 * The owner has accepted this substitution while a new form is prepared. What
 * is not acceptable is for it to be invisible, so every surface that can print
 * one of these says so, and `pdfRouteForRecord` stays the single place that
 * decides. When the sixth form arrives, add its route here and to the server
 * registry — that is the whole change. */
export type TemplateSubstitution = {
  route: string;
  printedSpec: string;
  actualSpec: string;
  reason: string;
};

function cvRinseMatrix(record: RecordData): 'pw' | 'wfi' | 'unknown' {
  const value = normalizeToken(record.sampleMatrix || record.samplingMethod || record.testMethod);
  if (value.includes('WFI') || value.includes('PUS')) return 'wfi';
  if (value.includes('PWPRW') || value.includes('RINSEPW') || value.includes('PW') || value.includes('PRW')) return 'pw';
  return 'unknown';
}

/** Non-null when the form that will print does not carry this record's own
 *  acceptance criterion. Callers must show it before generating. */
export function cvTemplateSubstitution(
  workflow: Workflow, record: RecordData, selectedMethod?: string
): TemplateSubstitution | null {
  if (workflow.id !== 'cv') return null;
  const route = pdfRouteForRecord(workflow, record, selectedMethod);
  if (route !== 'cleaning-validation-rinse-membrane') return null;
  if (cvRinseMatrix(record) !== 'pw') return null;
  return {
    route,
    printedSpec: '10 cfu/100 mL (WFI/PUS)',
    actualSpec: '100 cfu/mL (PW/PRW)',
    reason: 'Rinse-PW with Membrane Filtration has no approved form of its own yet, so the WFI/PUS form is used for its single-result table.'
  };
}
