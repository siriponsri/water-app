import { fellerCorrected } from '../appData';
import { applyCriticalCost } from './engine';
import type { ScoreBreakdown } from './types';
import { ACTION_LIMITS, SAMPLE_POINT_BY_ID } from './excursionContent';
import type { ExcursionCase, ExcursionDecision, PointReading, SamplePointDef } from './excursionTypes';

/** The Feller-corrected estimate for a reading, or the raw count for every non-active-air method. */
export function correctedCount(point: SamplePointDef, reading: PointReading): number {
  if (point.method !== 'active_air' || !reading.totalHoles) return reading.count;
  return fellerCorrected(reading.count, reading.totalHoles);
}

export function pointExceeds(point: SamplePointDef, reading: PointReading): boolean {
  return correctedCount(point, reading) > ACTION_LIMITS[point.grade][point.method];
}

/** Every sampled point in the case whose (corrected) reading clears its ค่าจำกัดในโจทย์. */
export function trueExceedanceIds(scenario: ExcursionCase): string[] {
  return Object.entries(scenario.readings)
    .filter(([id, reading]) => {
      const point = SAMPLE_POINT_BY_ID[id];
      return Boolean(point) && pointExceeds(point, reading);
    })
    .map(([id]) => id);
}

/** Exceedance points whose identity link back to the sample is broken. */
export function custodyInvalidIds(scenario: ExcursionCase): string[] {
  return trueExceedanceIds(scenario).filter((id) => scenario.readings[id]?.chainOfCustodyValid === false);
}

function longestCommonSubsequenceLength(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i][j] = a[i - 1] === b[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table[a.length][b.length];
}

export function evaluateFlagging(scenario: ExcursionCase, flaggedIds: string[]) {
  const truth = trueExceedanceIds(scenario);
  const truthSet = new Set(truth);
  const flaggedSet = new Set(flaggedIds);
  const correct = truth.filter((id) => flaggedSet.has(id));
  const missed = truth.filter((id) => !flaggedSet.has(id));
  const falsePositives = flaggedIds.filter((id) => !truthSet.has(id));
  const base = truth.length === 0
    ? (flaggedIds.length === 0 ? 1 : Math.max(0, 1 - flaggedIds.length * 0.34))
    : correct.length / truth.length;
  const penalty = truth.length === 0 ? 0 : Math.min(base, falsePositives.length * 0.15);
  const ratio = Math.max(0, base - penalty);
  return { correct, missed, falsePositives, ratio, score: Math.round(ratio * 30) };
}

export function evaluateSequence(scenario: ExcursionCase, orderedPathIds: string[], noPathAsserted: boolean) {
  const expected = scenario.expectedPathIds;
  if (expected.length === 0) {
    if (noPathAsserted && orderedPathIds.length === 0) return { ratio: 1, score: 25, invented: false };
    const invented = orderedPathIds.length >= 2;
    const ratio = orderedPathIds.length === 0 ? 0.8 : Math.max(0, 1 - orderedPathIds.length * 0.2);
    return { ratio, score: Math.round(ratio * 25), invented };
  }
  const match = longestCommonSubsequenceLength(orderedPathIds, expected);
  const ratio = match / expected.length;
  return { ratio, score: Math.round(ratio * 25), invented: false };
}

export function evaluateCapa(scenario: ExcursionCase, capaId: string) {
  return { correct: capaId === scenario.supportedCapaId, score: capaId === scenario.supportedCapaId ? 30 : 5 };
}

export type ExcursionEvaluationContext = {
  /** The score a critical error caps the run at; set by the chosen level. */
  criticalCeiling?: number;
  /** Taken off per distinct critical error, after the ceiling. */
  criticalPenalty?: number;
};

export function evaluateExcursionDecision(scenario: ExcursionCase, decision: ExcursionDecision, context: ExcursionEvaluationContext = {}): ScoreBreakdown {
  const criticalErrors: string[] = [];
  const flagging = evaluateFlagging(scenario, decision.flaggedIds);
  const sequence = evaluateSequence(scenario, decision.orderedPathIds, decision.noPathAsserted);
  const capa = evaluateCapa(scenario, decision.capaId);
  const invalidExceedances = custodyInvalidIds(scenario);
  const documented = decision.rationale.trim().length >= 20 && /\[[A-Z0-9-]+\]/i.test(decision.rationale);

  if (flagging.missed.length > 0) criticalErrors.push(`An exceedance was left unflagged: ${flagging.missed.join(', ')}.`);
  if (invalidExceedances.length > 0 && !decision.custodyAcknowledged) criticalErrors.push('A broken chain-of-custody result was treated as usable evidence without acknowledging the defect.');
  if (invalidExceedances.some((id) => decision.orderedPathIds.includes(id))) criticalErrors.push('A result with a broken identity link was chained into the ingress path.');
  if (sequence.invented) criticalErrors.push('An ingress path was built from findings that do not share a rising trail.');
  if (decision.capaId === 'escalate-qa-shutdown' && scenario.supportedCapaId !== 'escalate-qa-shutdown') criticalErrors.push('A shutdown was escalated without a confirmed, linked ingress path to support it.');
  if (decision.capaId === 'monitor-continue' && scenario.supportedCapaId !== 'monitor-continue') criticalErrors.push('No action was taken despite a fixture exceedance that required one.');

  const domains = [
    { label: 'Exceedance triage', earned: flagging.score, available: 30 },
    { label: 'Path reconstruction', earned: sequence.score, available: 25 },
    { label: 'CAPA calibration', earned: capa.score, available: 30 },
    { label: 'Documentation', earned: documented ? 15 : 5, available: 15 }
  ];
  const raw = domains.reduce((sum, domain) => sum + domain.earned, 0);
  const distinct = [...new Set(criticalErrors)];
  const cost = applyCriticalCost(raw, distinct, context.criticalCeiling, context.criticalPenalty);
  return { domains, total: cost.total, ceiling: cost.ceiling, criticalErrors: distinct };
}
