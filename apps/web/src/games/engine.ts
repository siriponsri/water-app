import type {
  BacterialCase, BacterialConclusion, CultureObservation, ScoreBreakdown
} from './types';

export function observationMatches(expected: CultureObservation, learner: CultureObservation) {
  return expected.medium === learner.medium
    && expected.growth === learner.growth
    && expected.abundance === learner.abundance
    && expected.reaction === learner.reaction
    && expected.morphotypes === learner.morphotypes
    && (expected.brothState === undefined || expected.brothState === learner.brothState);
}

export type BacterialDecision = {
  hypotheses: string[];
  observations: Partial<Record<'TSB' | 'SDA' | 'MSA' | 'MAC' | 'RV' | 'XLD', CultureObservation>>;
  conclusion: BacterialConclusion;
  confidence: 'low' | 'moderate' | 'high';
  nextAction: string;
  rationale: string;
  selectedMedia?: string[];
  chainOfCustodyValid?: boolean;
  mixedCultureAcknowledged?: boolean;
  controls?: string[];
  corrections?: Array<{ field: string; original: string; amended: string; reason: string }>;
};

export type BacterialEvaluationContext = {
  scenario?: BacterialCase;
  sequence?: string[];
  /**
   * The score a critical error caps the run at. Set by the chosen level —
   * beginner 79, review 69, expert 55 — so over-claiming costs what the
   * level says it costs. Defaults to the review figure for older callers.
   */
  criticalCeiling?: number;
  /** Taken off per distinct critical error, after the ceiling. */
  criticalPenalty?: number;
};

/** The level's cost of getting it wrong, applied the same way in both games. */
export function applyCriticalCost(raw: number, criticalErrors: string[], ceiling?: number, penalty = 0) {
  if (criticalErrors.length === 0) return { total: Math.min(raw, 100), ceiling: undefined };
  const capped = Math.min(raw, ceiling ?? 69);
  return { total: Math.max(0, capped - criticalErrors.length * penalty), ceiling: ceiling ?? 69 };
}

export function lintBacterialConclusion(decision: BacterialDecision, context: BacterialEvaluationContext = {}) {
  const findings: string[] = [];
  const observations = Object.values(decision.observations).filter(Boolean) as CultureObservation[];
  const hasInvalidChain = decision.chainOfCustodyValid === false || context.scenario?.chainOfCustodyValid === false;
  const mixed = context.scenario?.mixedCulture || observations.some((observation) => observation.morphotypes === 2);
  const requiredControls = context.scenario ? (context.scenario.requiredControls || ['positive', 'uninoculated']) : [];
  const controlsComplete = requiredControls.every((control) => (decision.controls || []).includes(control));
  const hasConfirm = /confirm|approved|repeat|resolve|separate|escalat/i.test(decision.nextAction);

  if (decision.conclusion === 'definitive_s_aureus') findings.push('Species-level "identified as" language exceeds the available media evidence.');
  if (decision.conclusion === 'presumptive_staph_like' && !hasConfirm) findings.push('A presumptive conclusion requires a confirmation plan.');
  if (decision.conclusion !== 'cannot_resolve' && decision.conclusion !== 'mixed_culture' && observations.length < 2) findings.push('A conclusion based on one non-specific result is not sufficiently supported.');
  if (hasInvalidChain && decision.conclusion !== 'cannot_resolve') findings.push('The identity link is invalid; biological evidence cannot repair the chain-of-custody defect.');
  if (mixed && decision.conclusion !== 'mixed_culture') findings.push('Two morphotypes require a mixed-culture or purity statement before a single-isolate conclusion.');
  if (!controlsComplete) findings.push(`Required session controls are missing: ${requiredControls.filter((control) => !(decision.controls || []).includes(control)).join(', ')}.`);
  if (context.scenario?.id === 'case-3-black-center' && !((context.sequence || decision.selectedMedia || []).includes('RV') && (context.sequence || decision.selectedMedia || []).includes('XLD'))) findings.push('RV turbidity alone does not support a Salmonella-like conclusion; link it to downstream XLD.');
  if (observations.some((observation) => observation.medium === 'SDA' && (observation.reaction === 'yeast_cream' || observation.reaction === 'mold_filamentous')) && decision.conclusion === 'definitive_s_aureus') findings.push('SDA fungal morphology cannot be converted into a definitive bacterial identification.');
  if (decision.rationale.trim().length > 0 && !/\[[A-Z0-9-]+\]/i.test(decision.rationale)) findings.push('The rationale should cite at least one collected evidence ID.');
  return [...new Set(findings)];
}

function caseEvidenceScore(scenario: BacterialCase, decision: BacterialDecision) {
  const observations = Object.values(decision.observations).filter(Boolean) as CultureObservation[];
  const observed = observations.filter((observation) => scenario.truth[observation.medium] && observationMatches(scenario.truth[observation.medium]!, observation)).length;
  const expectedCount = Object.keys(scenario.truth).length;
  const sequence = decision.selectedMedia || [];
  const sequenceCorrect = scenario.requiredSequence.every((medium) => sequence.includes(medium));
  const chainValid = decision.chainOfCustodyValid !== false && scenario.chainOfCustodyValid;
  const mixedCorrect = !scenario.mixedCulture || decision.conclusion === 'mixed_culture' || decision.mixedCultureAcknowledged === true;
  const requiredControls = scenario.requiredControls || ['positive', 'uninoculated'];
  const controlsComplete = requiredControls.every((control) => (decision.controls || []).includes(control));
  return { observations, observed, expectedCount, sequenceCorrect, chainValid, mixedCorrect, controlsComplete };
}

export function evaluateBacterialDecision(expected: Partial<Record<'TSB' | 'SDA' | 'MSA' | 'MAC' | 'RV' | 'XLD', CultureObservation>>, decision: BacterialDecision, context: BacterialEvaluationContext = {}): ScoreBreakdown {
  const scenario = context.scenario || ({
    id: 'compatibility-case', number: 1, title: 'Compatibility case', shortTitle: 'Compatibility', seed: 'compatibility', sample: '', briefing: '', question: '', availableMedia: Object.keys(expected) as never[], actionBudget: 6, requiredControls: [], requiredSequence: [], hypotheses: [], truth: expected, expectedConclusion: 'presumptive_staph_like', supportedNextAction: 'confirm-approved', maximumClaim: 'presumptive', chainOfCustodyValid: true, mixedCulture: false, defects: [], principle: ''
  } satisfies BacterialCase);
  const findings = lintBacterialConclusion(decision, { ...context, scenario });
  const observationEntries = Object.values(decision.observations).filter(Boolean) as CultureObservation[];
  const expectedEntries = Object.values(expected).filter(Boolean) as CultureObservation[];
  const observationCount = observationEntries.filter((observation) => expected[observation.medium] && observationMatches(expected[observation.medium]!, observation)).length;
  const highInformation = Boolean(decision.observations.MSA && decision.observations.MAC) || Boolean(decision.observations.RV && decision.observations.XLD);
  const evidence = caseEvidenceScore(scenario, decision);
  const expectedConclusion = scenario.expectedConclusion;
  const correctConclusion = decision.conclusion === expectedConclusion || (expectedConclusion === 'presumptive_lactose_fermenter' && decision.conclusion === 'gram_negative_enteric') || (expectedConclusion === 'presumptive_non_lactose_enteric' && decision.conclusion === 'cannot_resolve');
  const claimCalibrated = !findings.some((finding) => finding.includes('exceeds') || finding.includes('invalid') || finding.includes('morphotypes'));
  const documentation = decision.rationale.trim().length >= 20 && /\[[A-Z0-9-]+\]/i.test(decision.rationale);
  const domains = [
    { label: 'Hypothesis quality', earned: decision.hypotheses.length >= 2 && decision.hypotheses.length <= 5 ? 15 : 7, available: 15 },
    { label: 'Test strategy', earned: highInformation || evidence.sequenceCorrect ? 20 : 10, available: 20 },
    { label: 'Observation accuracy', earned: expectedEntries.length ? Math.round((observationCount / expectedEntries.length) * 20) : 0, available: 20 },
    { label: 'Evidence integrity', earned: evidence.chainValid && evidence.mixedCorrect && evidence.controlsComplete ? 15 : 4, available: 15 },
    { label: 'Conclusion calibration', earned: correctConclusion && claimCalibrated && decision.confidence !== 'low' ? 25 : correctConclusion && claimCalibrated ? 20 : 5, available: 25 },
    { label: 'Documentation', earned: documentation ? 5 : 2, available: 5 }
  ];
  const raw = domains.reduce((sum, domain) => sum + domain.earned, 0);
  const criticalErrors = [...findings];
  if (scenario.chainOfCustodyValid === false && decision.conclusion !== 'cannot_resolve') criticalErrors.push('A broken chain of custody was used to make an organism claim.');
  if (scenario.mixedCulture && decision.conclusion !== 'mixed_culture') criticalErrors.push('The mixed-culture clue was not acknowledged.');
  if (!evidence.controlsComplete) criticalErrors.push('Required positive and uninoculated controls were not planned.');
  const distinct = [...new Set(criticalErrors)];
  const cost = applyCriticalCost(raw, distinct, context.criticalCeiling, context.criticalPenalty);
  return { domains, total: cost.total, ceiling: cost.ceiling, criticalErrors: distinct };
}

export function seededIndex(seed: string, length: number) {
  if (length <= 0) return 0;
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

