import { describe, expect, it } from 'vitest';
import { EXCURSION_CASES, excursionCaseById } from './excursionContent';
import {
  correctedCount, custodyInvalidIds, evaluateExcursionDecision, evaluateFlagging, evaluateSequence, pointExceeds, trueExceedanceIds
} from './excursionEngine';
import { SAMPLE_POINT_BY_ID } from './excursionContent';
import type { ExcursionDecision } from './excursionTypes';

function decisionFor(caseId: string, overrides: Partial<ExcursionDecision> = {}): ExcursionDecision {
  const scenario = excursionCaseById(caseId);
  return {
    flaggedIds: trueExceedanceIds(scenario),
    orderedPathIds: scenario.expectedPathIds,
    noPathAsserted: scenario.expectedPathIds.length === 0,
    custodyAcknowledged: custodyInvalidIds(scenario).length > 0,
    capaId: scenario.supportedCapaId,
    rationale: `[${scenario.expectedPathIds[0] || Object.keys(scenario.readings)[0] || 'CASE'}] supports the fixture-only training conclusion above.`,
    ...overrides
  };
}

describe('excursion trace content', () => {
  it('ships at least six scored cases plus orientation', () => {
    const scored = EXCURSION_CASES.filter((item) => !item.orientationOnly);
    expect(scored.length).toBeGreaterThanOrEqual(6);
    expect(EXCURSION_CASES.some((item) => item.orientationOnly)).toBe(true);
  });

  it('every reading references a real sample point', () => {
    for (const scenario of EXCURSION_CASES) {
      for (const id of Object.keys(scenario.readings)) {
        expect(SAMPLE_POINT_BY_ID[id]).toBeDefined();
      }
    }
  });
});

describe('feller correction changes the exceedance determination', () => {
  it('clears the ค่าจำกัดในโจทย์ on the raw count but exceeds it once corrected', () => {
    const scenario = excursionCaseById('excursion-4-feller-trap');
    const point = SAMPLE_POINT_BY_ID['p-mech-gallery'];
    const reading = scenario.readings['p-mech-gallery'];
    expect(reading.count).toBeLessThan(100);
    expect(correctedCount(point, reading)).toBeGreaterThan(100);
    expect(pointExceeds(point, reading)).toBe(true);
    expect(trueExceedanceIds(scenario)).toEqual(['p-mech-gallery']);
  });
});

describe('flagging', () => {
  it('scores full marks when every true exceedance is flagged with no false positives', () => {
    const scenario = excursionCaseById('excursion-3-airlock-breach');
    const truth = trueExceedanceIds(scenario);
    expect(evaluateFlagging(scenario, truth).score).toBe(30);
  });

  it('penalises a missed exceedance', () => {
    const scenario = excursionCaseById('excursion-1-gowning-outlier');
    const result = evaluateFlagging(scenario, []);
    expect(result.missed).toEqual(['p-gown-bench']);
    expect(result.score).toBeLessThan(30);
  });

  it('rewards recognising a fully clean round', () => {
    const scenario = excursionCaseById('excursion-2-clean-round');
    expect(trueExceedanceIds(scenario)).toEqual([]);
    expect(evaluateFlagging(scenario, []).score).toBe(30);
  });
});

describe('sequence reconstruction', () => {
  it('gives full credit for the exact rising trail', () => {
    const scenario = excursionCaseById('excursion-3-airlock-breach');
    expect(evaluateSequence(scenario, scenario.expectedPathIds, false).score).toBe(25);
  });

  it('gives partial credit for a path missing one link', () => {
    const scenario = excursionCaseById('excursion-3-airlock-breach');
    const partial = evaluateSequence(scenario, ['p-airlock2', 'p-glove-b', 'p-rabs-face'], false);
    expect(partial.score).toBeGreaterThan(0);
    expect(partial.score).toBeLessThan(25);
  });

  it('flags an invented path when the case has no coherent trail', () => {
    const scenario = excursionCaseById('excursion-5-scattered');
    const invented = evaluateSequence(scenario, ['p-d-door', 'p-mech-gallery', 'p-drain'], false);
    expect(invented.invented).toBe(true);
  });

  it('gives full credit for correctly asserting no path exists', () => {
    const scenario = excursionCaseById('excursion-5-scattered');
    expect(evaluateSequence(scenario, [], true).score).toBe(25);
  });
});

describe('full decision scoring', () => {
  it('scores a calibrated clean-round decision at 100 with no ceiling', () => {
    const score = evaluateExcursionDecision(excursionCaseById('excursion-2-clean-round'), decisionFor('excursion-2-clean-round'));
    expect(score.total).toBe(100);
    expect(score.ceiling).toBeUndefined();
  });

  it('scores a calibrated breach decision at 100 with no ceiling', () => {
    const score = evaluateExcursionDecision(excursionCaseById('excursion-3-airlock-breach'), decisionFor('excursion-3-airlock-breach'));
    expect(score.total).toBe(100);
    expect(score.ceiling).toBeUndefined();
  });

  it('caps the score when a broken chain-of-custody result is used unacknowledged', () => {
    const scenario = excursionCaseById('excursion-6-broken-chain');
    const decision = decisionFor('excursion-6-broken-chain', { custodyAcknowledged: false });
    const score = evaluateExcursionDecision(scenario, decision);
    expect(score.criticalErrors).toContain('A broken chain-of-custody result was treated as usable evidence without acknowledging the defect.');
    expect(score.total).toBeLessThanOrEqual(69);
  });

  it('caps the score when the broken-custody result is chained into the path', () => {
    const scenario = excursionCaseById('excursion-6-broken-chain');
    const decision = decisionFor('excursion-6-broken-chain', { orderedPathIds: [...scenario.expectedPathIds, 'p-rabs-face'] });
    const score = evaluateExcursionDecision(scenario, decision);
    expect(score.criticalErrors.some((error) => error.includes('broken identity link'))).toBe(true);
  });

  it('caps the score for an unsupported shutdown escalation', () => {
    const scenario = excursionCaseById('excursion-1-gowning-outlier');
    const decision = decisionFor('excursion-1-gowning-outlier', { capaId: 'escalate-qa-shutdown' });
    const score = evaluateExcursionDecision(scenario, decision);
    expect(score.criticalErrors.some((error) => error.includes('shutdown was escalated'))).toBe(true);
    expect(score.total).toBeLessThanOrEqual(69);
  });

  it('caps the score for taking no action on a real exceedance', () => {
    const scenario = excursionCaseById('excursion-4-feller-trap');
    const decision = decisionFor('excursion-4-feller-trap', { flaggedIds: [], orderedPathIds: [], noPathAsserted: true, capaId: 'monitor-continue' });
    const score = evaluateExcursionDecision(scenario, decision);
    expect(score.criticalErrors.length).toBeGreaterThan(0);
    expect(score.total).toBeLessThanOrEqual(69);
  });
});
