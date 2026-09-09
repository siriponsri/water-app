import { describe, expect, it } from 'vitest';
import { BACTERIAL_CASES } from './content';
import { budgetFor, DIFFICULTY_ORDER, DIFFICULTY_RULES, rulesFor } from './difficulty';
import { evaluateBacterialDecision, type BacterialDecision } from './engine';
import { evaluateExcursionDecision } from './excursionEngine';
import { EXCURSION_CASES } from './excursionContent';

/* Until v7.1n `difficulty` was stored and exported but read by no rule.
   These tests exist so it cannot quietly become a label again. */

const overClaim: BacterialDecision = {
  hypotheses: ['staph-aureus-like', 'cons-like'],
  observations: {},
  conclusion: 'definitive_s_aureus',
  confidence: 'high',
  nextAction: 'none',
  rationale: 'Claimed a species from one non-specific result without controls.',
  controls: []
};

describe('difficulty changes the rules, not just the label', () => {
  it('every level is defined and ordered beginner → review → expert', () => {
    expect(DIFFICULTY_ORDER).toEqual(['guided', 'standard', 'expert']);
    for (const id of DIFFICULTY_ORDER) expect(DIFFICULTY_RULES[id].id).toBe(id);
  });

  it('an unknown level falls back to review rather than crashing', () => {
    expect(rulesFor('nonsense' as never).id).toBe('standard');
  });

  it('the action budget widens for beginners and tightens for experts', () => {
    expect(budgetFor(6, 'guided')).toBe(8);
    expect(budgetFor(6, 'standard')).toBe(6);
    expect(budgetFor(6, 'expert')).toBe(5);
  });

  it('never lets the expert penalty make a case unwinnable', () => {
    expect(budgetFor(2, 'expert')).toBe(2);
    expect(budgetFor(1, 'expert')).toBe(2);
  });

  it('an over-claim costs more at expert than at review, and least at beginner', () => {
    const scenario = BACTERIAL_CASES[1];
    const at = (level: keyof typeof DIFFICULTY_RULES) =>
      evaluateBacterialDecision(scenario.truth, overClaim, {
        scenario,
        criticalCeiling: DIFFICULTY_RULES[level].criticalCeiling,
        criticalPenalty: DIFFICULTY_RULES[level].criticalPenalty
      }).total;
    const beginner = at('guided');
    const review = at('standard');
    const expert = at('expert');
    expect(beginner).toBeGreaterThan(review);
    expect(review).toBeGreaterThan(expert);
    expect(expert).toBeLessThanOrEqual(DIFFICULTY_RULES.expert.criticalCeiling);
    expect(expert).toBeGreaterThanOrEqual(0);
  });

  it('applies the same ceiling rule to the excursion campaign', () => {
    const scenario = EXCURSION_CASES.find((item) => !item.orientationOnly)!;
    const decision = {
      flaggedIds: [], orderedPathIds: [], noPathAsserted: false,
      custodyAcknowledged: false, capaId: 'monitor-continue', rationale: ''
    };
    const review = evaluateExcursionDecision(scenario, decision, { criticalCeiling: 69, criticalPenalty: 4 });
    const expert = evaluateExcursionDecision(scenario, decision, { criticalCeiling: 55, criticalPenalty: 9 });
    expect(review.criticalErrors.length).toBeGreaterThan(0);
    expect(expert.total).toBeLessThan(review.total);
  });

  it('a clean run is not capped at any level', () => {
    const scenario = BACTERIAL_CASES[1];
    const clean: BacterialDecision = {
      hypotheses: ['staph-aureus-like', 'cons-like', 'lactose-fermenter'],
      observations: scenario.truth,
      conclusion: scenario.expectedConclusion,
      confidence: 'moderate',
      nextAction: 'confirm-approved',
      rationale: '[MSA-OBS-01] supports a salt-tolerant, mannitol-positive pattern while [MAC-OBS-02] is compatible.',
      selectedMedia: scenario.requiredSequence,
      controls: scenario.requiredControls || ['positive', 'uninoculated']
    };
    for (const id of DIFFICULTY_ORDER) {
      const score = evaluateBacterialDecision(scenario.truth, clean, { scenario, sequence: clean.selectedMedia, criticalCeiling: DIFFICULTY_RULES[id].criticalCeiling, criticalPenalty: DIFFICULTY_RULES[id].criticalPenalty });
      expect(score.ceiling, `${id} capped a clean run`).toBeUndefined();
    }
  });

  it('only the beginner level shows hints and warns before submitting', () => {
    expect(DIFFICULTY_RULES.guided.warnBeforeSubmit).toBe(true);
    expect(DIFFICULTY_RULES.standard.warnBeforeSubmit).toBe(false);
    expect(DIFFICULTY_RULES.expert.warnBeforeSubmit).toBe(false);
    expect(DIFFICULTY_RULES.guided.showSequenceHint).toBe(true);
    expect(DIFFICULTY_RULES.expert.showMediaPurpose).toBe(false);
  });

  it('a mistake costs nothing extra at beginner and most at expert', () => {
    expect(DIFFICULTY_RULES.guided.criticalPenalty).toBe(0);
    expect(DIFFICULTY_RULES.expert.criticalPenalty).toBeGreaterThan(DIFFICULTY_RULES.standard.criticalPenalty);
  });

  it('only the beginner level keeps the best attempt', () => {
    expect(DIFFICULTY_RULES.guided.keepBestAttempt).toBe(true);
    expect(DIFFICULTY_RULES.standard.keepBestAttempt).toBe(false);
    expect(DIFFICULTY_RULES.expert.keepBestAttempt).toBe(false);
  });
});
