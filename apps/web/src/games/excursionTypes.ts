/* Types for Excursion Trace. Kept separate from types.ts (which the other two
   simulations own) so that file can stay untouched, per the rebuild brief. */

export type ExcursionGrade = 'A' | 'B' | 'C' | 'D';
export type ExcursionMethod = 'settle_plate' | 'contact_plate' | 'active_air' | 'glove_print' | 'surface_swab';

export type SamplePointDef = {
  id: string;
  label: string;
  room: string;
  grade: ExcursionGrade;
  method: ExcursionMethod;
  /** Position on the shared floor plan, 0-100 in both axes. */
  x: number;
  y: number;
};

export type PointReading = {
  /** Raw CFU for every method except active_air, where this is the raw positive-hole count. */
  count: number;
  /** Only set for active_air points; the sampler’s total hole count (Feller correction input). */
  totalHoles?: number;
  /** False only on the one fixture point per capstone case with a broken identity link. */
  chainOfCustodyValid?: boolean;
};

export type CapaOption = {
  id: string;
  label: string;
  detail: string;
};

export type ExcursionCase = {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  /** Absent only for the orientation entry, which carries no readings. */
  seed?: string;
  briefing: string;
  question: string;
  /** Points sampled this round, keyed by SamplePointDef id. */
  readings: Record<string, PointReading>;
  /** The plausible ingress order, oldest breach first. Empty when no coherent path exists. */
  expectedPathIds: string[];
  supportedCapaId: string;
  capaRationale: string;
  unsupportedNote: string;
  principle: string;
  orientationOnly?: boolean;
};

export type ExcursionDecision = {
  flaggedIds: string[];
  orderedPathIds: string[];
  noPathAsserted: boolean;
  custodyAcknowledged: boolean;
  capaId: string;
  rationale: string;
};
