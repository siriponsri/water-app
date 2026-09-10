/* =========================================================================
   What each level actually changes
   -------------------------------------------------------------------------
   Until v7.1n `difficulty` was a label: it was stored, exported in the
   evidence packet and used in the storage key, but no rule read it. Picking
   "expert" changed nothing you could feel. This file is the fix — every
   level is a set of rules the two simulations read, so the choice changes
   how the game is played and how it is scored.

   The house style is set by who plays. Most people here are experienced and
   run these to keep their eye in, so REVIEW is the default: plan blind,
   commit blind, and the first attempt is the one that scores. BEGINNER
   exists for new staff — the media tell you what they are for, the glossary
   is open, and the workspace warns before a mistake is committed rather
   than after. EXPERT takes the scaffolding away and makes an over-claim
   cost more.

   The identifiers are unchanged ('guided' | 'standard' | 'expert') because
   saved progress, evidence packets and storage keys already carry them.
   Only the meaning and the Thai labels are new.
   ========================================================================= */

import type { GameDifficulty } from './types';

export type DifficultyRules = {
  id: GameDifficulty;
  /** Thai label shown in the header selector. */
  label: string;
  /** Who this level is for, one line, shown under the selector. */
  who: string;
  /** Media cards show what each medium is for, and what it cannot prove. */
  showMediaPurpose: boolean;
  /** The sequence requirement (RV before XLD) is spelled out on the card. */
  showSequenceHint: boolean;
  /** Glossary starts open instead of hidden behind the instructor panel. */
  glossaryOpen: boolean;
  /** Before a conclusion is submitted, show what the review would flag. */
  warnBeforeSubmit: boolean;
  /** Added to (or taken from) the case's authored action budget. */
  actionBudgetDelta: number;
  /** Score ceiling once a critical error is recorded. */
  criticalCeiling: number;
  /**
   * Taken off per distinct critical error, after the ceiling. The ceiling
   * alone only bites a run that was otherwise scoring well; without this a
   * poor run scored the same at every level, which is the very "difficulty
   * is only a label" problem this file exists to fix.
   */
  criticalPenalty: number;
  /** Beginner keeps the best attempt; the others keep the first. */
  keepBestAttempt: boolean;
};

export const DIFFICULTY_RULES: Record<GameDifficulty, DifficultyRules> = {
  guided: {
    id: 'guided',
    label: 'เริ่มต้น',
    who: 'สำหรับพนักงานใหม่ · บอกหน้าที่ของอาหารเลี้ยงเชื้อ เตือนก่อนส่ง และเลือกได้มากขึ้น 2 ครั้ง',
    showMediaPurpose: true,
    showSequenceHint: true,
    glossaryOpen: true,
    warnBeforeSubmit: true,
    actionBudgetDelta: 2,
    criticalCeiling: 79,
    criticalPenalty: 0,
    keepBestAttempt: true
  },
  standard: {
    id: 'standard',
    label: 'ทบทวน',
    who: 'สำหรับคนมีประสบการณ์ · วางแผนเอง ส่งเลย ไม่มีคำเตือน และนับคะแนนครั้งแรก',
    showMediaPurpose: true,
    showSequenceHint: false,
    glossaryOpen: false,
    warnBeforeSubmit: false,
    actionBudgetDelta: 0,
    criticalCeiling: 69,
    criticalPenalty: 4,
    keepBestAttempt: false
  },
  expert: {
    id: 'expert',
    label: 'ยาก',
    who: 'ไม่มีคำใบ้ · เลือกได้น้อยลง 1 ครั้ง และสรุปเกินหลักฐานเสียคะแนนหนักกว่าเดิม',
    showMediaPurpose: false,
    showSequenceHint: false,
    glossaryOpen: false,
    warnBeforeSubmit: false,
    actionBudgetDelta: -1,
    criticalCeiling: 55,
    criticalPenalty: 9,
    keepBestAttempt: false
  }
};

export const DIFFICULTY_ORDER: GameDifficulty[] = ['guided', 'standard', 'expert'];

export function rulesFor(difficulty: GameDifficulty): DifficultyRules {
  return DIFFICULTY_RULES[difficulty] || DIFFICULTY_RULES.standard;
}

/**
 * The action budget this level plays with. Never below 2 — a case needs at
 * least two media before any conclusion is supportable, so the expert
 * penalty must not make a case unwinnable.
 */
export function budgetFor(authored: number, difficulty: GameDifficulty) {
  return Math.max(2, authored + rulesFor(difficulty).actionBudgetDelta);
}
