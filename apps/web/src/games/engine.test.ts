import { describe, expect, it } from 'vitest';
import { BACTERIAL_CASE, BACTERIAL_CASES, PROFILE_VALID } from './content';
import {
  evaluateBacterialDecision, lintBacterialConclusion,
  observationMatches, seededIndex, type BacterialDecision
} from './engine';

function calibratedBacterialDecision(overrides: Partial<BacterialDecision> = {}): BacterialDecision {
  return {
    hypotheses: ['staph-aureus-like', 'cons-like', 'lactose-fermenter'],
    observations: BACTERIAL_CASE.truth,
    conclusion: 'presumptive_staph_like',
    confidence: 'moderate',
    nextAction: 'confirm-approved',
    rationale: '[MSA] supports a salt-tolerant, mannitol-positive pattern while [MAC] is compatible.',
    ...overrides
  };
}

describe('game content and deterministic rules', () => {
  it('loads a valid six-media educational profile', () => {
    expect(PROFILE_VALID).toBe(true);
  });

  it('same seed always selects the same variant', () => {
    expect(seededIndex('ANF3-1042', 9)).toBe(seededIndex('ANF3-1042', 9));
  });

  it('matches objective culture fields separately from interpretation', () => {
    expect(observationMatches(BACTERIAL_CASE.truth.MSA, { ...BACTERIAL_CASE.truth.MSA })).toBe(true);
    expect(observationMatches(BACTERIAL_CASE.truth.MSA, { ...BACTERIAL_CASE.truth.MSA, reaction: 'unchanged' })).toBe(false);
  });

  it('caps a definitive S. aureus claim from MSA/MAC evidence', () => {
    const decision = calibratedBacterialDecision({ conclusion: 'definitive_s_aureus' });
    const score = evaluateBacterialDecision(BACTERIAL_CASE.truth, decision);
    expect(lintBacterialConclusion(decision)[0]).toMatch(/exceeds/);
    expect(score.total).toBeLessThanOrEqual(69);
  });

  it('accepts a calibrated presumptive conclusion with confirmation', () => {
    const decision = calibratedBacterialDecision();
    expect(lintBacterialConclusion(decision)).toEqual([]);
    expect(evaluateBacterialDecision(BACTERIAL_CASE.truth, decision).total).toBe(100);
  });

  it('requires RV before XLD for the enrichment case', () => {
    const scenario = BACTERIAL_CASES.find((item) => item.id === 'case-3-black-center')!;
    const decision = calibratedBacterialDecision({
      observations: { MAC: scenario.truth.MAC, XLD: scenario.truth.XLD },
      selectedMedia: ['XLD'],
      conclusion: 'presumptive_salmonella_like',
      rationale: '[XLD-OBS-01] shows a black-centered pattern after no linked enrichment.'
    });
    expect(lintBacterialConclusion(decision, { scenario, sequence: ['XLD'] })).toContain('RV turbidity alone does not support a Salmonella-like conclusion; link it to downstream XLD.');
  });

  it('requires a mixed-culture acknowledgement before a single-isolate claim', () => {
    const scenario = BACTERIAL_CASES.find((item) => item.id === 'case-6-two-answers')!;
    const decision = calibratedBacterialDecision({
      observations: scenario.truth,
      conclusion: 'presumptive_lactose_fermenter',
      selectedMedia: ['TSB', 'MAC'],
      rationale: '[MAC-OBS-01] shows pink and pale morphotypes.'
    });
    expect(lintBacterialConclusion(decision, { scenario, sequence: ['TSB', 'MAC'] })).toContain('Two morphotypes require a mixed-culture or purity statement before a single-isolate conclusion.');
  });

  it('keeps SDA fungal morphology below a definitive bacterial claim', () => {
    const scenario = BACTERIAL_CASES.find((item) => item.id === 'case-5-colony-not-here')!;
    const decision = calibratedBacterialDecision({
      observations: scenario.truth,
      conclusion: 'definitive_s_aureus',
      selectedMedia: ['TSB', 'SDA'],
      rationale: '[SDA-OBS-01] shows cream yeast-like morphology.'
    });
    expect(lintBacterialConclusion(decision, { scenario, sequence: ['TSB', 'SDA'] })).toContain('SDA fungal morphology cannot be converted into a definitive bacterial identification.');
  });

  it('invalidates an identity claim when chain of custody is broken', () => {
    const scenario = BACTERIAL_CASES.find((item) => item.id === 'case-7-wrong-tube')!;
    const decision = calibratedBacterialDecision({
      observations: scenario.truth,
      conclusion: 'presumptive_salmonella_like',
      selectedMedia: ['TSB', 'RV', 'XLD'],
      chainOfCustodyValid: false,
      rationale: '[XLD-OBS-01] is a black-centered pattern.'
    });
    expect(lintBacterialConclusion(decision, { scenario, sequence: decision.selectedMedia })).toContain('The identity link is invalid; biological evidence cannot repair the chain-of-custody defect.');
  });
});
