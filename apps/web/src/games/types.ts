export type GameDifficulty = 'guided' | 'standard' | 'expert';
export type GameRole = 'learner' | 'instructor';

export type MediaId = 'TSB' | 'SDA' | 'MSA' | 'MAC' | 'RV' | 'XLD';
export type MediaForm = 'broth' | 'agar';

export type AuditEvent = {
  id: string;
  at: string;
  action: string;
  detail: string;
  source: 'learner' | 'system';
};

export type EvidenceItem = {
  id: string;
  source: string;
  observation: string;
  interpretation?: string;
  validity: 'valid' | 'invalid' | 'equivocal';
  confidence?: 'high' | 'moderate' | 'low';
  chainOfCustody?: 'linked' | 'broken' | 'not_applicable';
};

export type ScoreBreakdown = {
  domains: Array<{ label: string; earned: number; available: number }>;
  total: number;
  ceiling?: number;
  criticalErrors: string[];
};

export type ObservationConfidence = 'high' | 'moderate' | 'low';
export type BrothState = 'clear' | 'equivocal' | 'turbid';
export type ReactionState =
  | 'not_applicable'
  | 'yellowing'
  | 'unchanged'
  | 'pink_red'
  | 'pale_colorless'
  | 'red_pink'
  | 'black_center'
  | 'atypical'
  | 'yeast_cream'
  | 'mold_filamentous';

export type BacterialConclusion =
  | 'presumptive_staph_like'
  | 'definitive_s_aureus'
  | 'gram_negative_enteric'
  | 'presumptive_lactose_fermenter'
  | 'presumptive_salmonella_like'
  | 'presumptive_non_lactose_enteric'
  | 'non_bacterial_suspected'
  | 'cannot_resolve'
  | 'mixed_culture';

export type CultureObservation = {
  medium: MediaId;
  growth: 'none_visible' | 'present' | 'equivocal';
  abundance: 'not_applicable' | 'sparse' | 'moderate' | 'heavy';
  reaction: ReactionState;
  morphotypes: 0 | 1 | 2;
  confidence: ObservationConfidence;
  brothState?: BrothState;
};

export type Hypothesis = {
  id: string;
  label: string;
  maximum: string;
  increasesWith: string;
  weakensWith: string;
  confounder: string;
};

export type BacterialCase = {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  seed: string;
  sample: string;
  briefing: string;
  question: string;
  availableMedia: MediaId[];
  actionBudget: number;
  requiredControls?: string[];
  requiredSequence: MediaId[];
  hypotheses: string[];
  truth: Partial<Record<MediaId, CultureObservation>>;
  expectedConclusion: BacterialConclusion;
  supportedNextAction: string;
  maximumClaim: string;
  chainOfCustodyValid: boolean;
  mixedCulture: boolean;
  defects: string[];
  principle: string;
};

export type EvidencePacket = {
  id?: string;
  schemaVersion: 2;
  simulation: string;
  profileId: string;
  trainingOnly: true;
  campaignId: string;
  scenarioId: string;
  scenarioTitle: string;
  exportedAt: string;
  role: GameRole;
  difficulty: GameDifficulty;
  decision: unknown;
  evidence: EvidenceItem[];
  audit: AuditEvent[];
  score: ScoreBreakdown;
  notes?: string[];
};

export type StoredGameProfile = {
  id: string;
  displayName: string;
  effectiveDate: string;
  educationalOnly: true;
  disclaimer: string;
  media: Array<{ id: MediaId; name: string; form: MediaForm; role: string; boundary: string }>;
};
