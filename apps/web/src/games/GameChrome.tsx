import { Accessibility, Box, Download, FileText, Printer, RotateCcw, ShieldCheck } from 'lucide-react';
import { DIFFICULTY_ORDER, DIFFICULTY_RULES, rulesFor } from './difficulty';
import type { AuditEvent, EvidenceItem, GameDifficulty, GameRole, ScoreBreakdown } from './types';

export const PHASE_LABELS: Record<string, string> = {
  campaign: 'ภารกิจ', orientation: 'ปฐมนิเทศ', briefing: 'โจทย์', intake: 'รับ lot', hypotheses: 'ตั้งสมมติฐาน',
  planning: 'วางแผน', flagging: 'คัดกรอง', sequencing: 'เรียงลำดับ', capa: 'CAPA', setup: 'จัดชุดทดสอบ', incubation: 'บ่มเชื้อ',
  observation: 'อ่านผล', evidence: 'ตรวจหลักฐาน', interpretation: 'ตีความ', disposition: 'ตัดสินผล',
  conclusion: 'สรุป', qa_review: 'QA ตรวจ', debrief: 'QA สรุปงาน'
};

/** A phase’s task heading. No eyebrow: the campaign nav and header dl below
 *  already carry the "which step is this" context, so the panel itself is
 *  just a title and a sentence — the Index-First house voice. */
export function PhaseHeading({ title, description }: { title: string; description?: string }) {
  return <div className="phase-heading"><h1>{title}</h1>{description && <p>{description}</p>}</div>;
}

export function SimulationHeader({ title, phase, code, autosaved, twoD, onToggle2D, role, difficulty, onRoleChange, onDifficultyChange }: {
  title: string;
  phase: string;
  code: string;
  autosaved: boolean;
  twoD?: boolean;
  onToggle2D?: () => void;
  role?: GameRole;
  difficulty?: GameDifficulty;
  onRoleChange?: (role: GameRole) => void;
  onDifficultyChange?: (difficulty: GameDifficulty) => void;
}) {
  return <header className="sim-topbar">
    <strong className="sim-topbar-title">{title}</strong>
    <dl className="sim-topbar-facts">
      <div><dt>ขั้นตอน</dt><dd>{PHASE_LABELS[phase] || phase}</dd></div>
      <div><dt>เลขอ้างอิง</dt><dd className="data">{code}</dd></div>
      <div><dt>การบันทึก</dt><dd>{autosaved ? 'บันทึกในเครื่องแล้ว' : 'กำลังบันทึก…'}</dd></div>
    </dl>
    <div className="sim-topbar-controls">
      {onDifficultyChange && <label className="sim-select-compact" title={rulesFor(difficulty || 'standard').who}><span>ระดับ</span><select aria-label="ระดับความยาก" value={difficulty} onChange={(event) => onDifficultyChange(event.target.value as GameDifficulty)}>{DIFFICULTY_ORDER.map((id) => <option key={id} value={id}>{DIFFICULTY_RULES[id].label}</option>)}</select></label>}
      {onRoleChange && <button type="button" className={`btn quiet sm ${role === 'instructor' ? 'is-active' : ''}`} onClick={() => onRoleChange(role === 'instructor' ? 'learner' : 'instructor')} aria-pressed={role === 'instructor'}><ShieldCheck size={15} aria-hidden="true" /><span>{role === 'instructor' ? 'ผู้สอน' : 'ผู้เรียน'}</span></button>}
      {onToggle2D && <button type="button" className="btn quiet sm icon-only" onClick={onToggle2D} aria-pressed={twoD} title={twoD ? 'สลับเป็นโต๊ะแบบ 3D' : 'สลับเป็นโต๊ะแบบ 2D'}>{twoD ? <Box size={16} aria-hidden="true" /> : <Accessibility size={16} aria-hidden="true" />}<span className="sr-only">{twoD ? 'มุมมองโต๊ะ 3D' : 'มุมมองโต๊ะ 2D'}</span></button>}
    </div>
  </header>;
}

/** One line saying what the chosen level does, on the campaign screen where
 *  the level is picked — so nobody starts a run guessing what it changed. */
export function DifficultyNote({ difficulty }: { difficulty: GameDifficulty }) {
  const rules = rulesFor(difficulty);
  return <p className="difficulty-note"><strong>ระดับ {rules.label}</strong>{rules.who}</p>;
}

export function CampaignNav({ items, active, onSelect }: { items: Array<{ id: string; label: string; complete?: boolean }>; active: string; onSelect: (id: string) => void }) {
  return <nav className="sim-crumbs" aria-label="ชุดภารกิจ">
    <span className="sim-crumbs-label">ภารกิจ</span>
    <ol>{items.map((item) => <li key={item.id}><button type="button" className={`crumb ${item.id === active ? 'is-active' : ''} ${item.complete ? 'is-complete' : ''}`} aria-current={item.id === active ? 'step' : undefined} onClick={() => onSelect(item.id)}><span className="crumb-index data">{item.id.replace(/\D/g, '') || '0'}</span><span className="crumb-label">{item.label}</span></button></li>)}</ol>
  </nav>;
}

export function EvidenceRail({ evidence, auditEvents, status = 'Evidence appears after a committed observation.' }: { evidence: EvidenceItem[]; auditEvents: AuditEvent[]; status?: string }) {
  return <aside className="evidence-rail" aria-label="หลักฐานที่เก็บได้ และประวัติการทำงาน">
    <div className="evidence-rail-head"><span>หลักฐาน</span><strong className="data">{evidence.length}</strong></div>
    <div className="evidence-stack">
      {evidence.length ? evidence.map((item) => <article key={item.id} className={`evidence-card is-${item.validity}`}>
        <div className="evidence-card-meta"><span className="data">{item.id}</span>{item.chainOfCustody === 'broken' && <b>สายโยงขาด</b>}</div>
        <strong>{item.source}</strong>
        <p>{item.observation}</p>
        {item.interpretation && <small>{item.interpretation}</small>}
        {item.confidence && <em>Confidence: {item.confidence}</em>}
      </article>) : <p className="evidence-rail-empty">{status}</p>}
    </div>
    <details className="audit-log"><summary>ประวัติการทำงาน <span className="data">{auditEvents.length}</span></summary><ol>{auditEvents.slice().reverse().map((event) => <li key={event.id}><span>{event.action}</span><p>{event.detail}</p><time className="data">{new Date(event.at).toLocaleTimeString()}</time></li>)}</ol></details>
  </aside>;
}

export function Debrief({ score, supported, chosen, principle, onExport, onPrint, onReset, onReport, reportId }: {
  score: ScoreBreakdown;
  supported: string;
  chosen: string;
  principle: string;
  onExport: () => void;
  onPrint?: () => void;
  onReset: () => void;
  onReport?: () => void;
  reportId?: string;
}) {
  return <section className="debrief" aria-labelledby="debrief-title">
    <div className="debrief-score"><span>QA ตรวจ</span><strong className="data">{score.total}</strong><small>/ 100</small></div>
    <div className="debrief-summary">
      <h1 id="debrief-title">ตรวจหลักฐานครบแล้ว</h1>
      <div className="decision-compare">
        <div><span>คำตัดสินของคุณ</span><strong>{chosen}</strong></div>
        <div><span>หลักฐานรองรับ</span><strong>{supported}</strong></div>
      </div>
      {score.criticalErrors.length > 0 && <div className="critical-findings" role="status"><strong>จุดที่พลาดสำคัญ</strong><ul>{score.criticalErrors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      <blockquote>{principle}</blockquote>
    </div>
    <div className="score-table">{score.domains.map((domain) => <div key={domain.label}><span>{domain.label}</span><meter min="0" max={domain.available} value={domain.earned} /><strong className="data">{domain.earned}/{domain.available}</strong></div>)}</div>
    {score.ceiling && <p className="score-ceiling">Score capped at {score.ceiling} — a critical scientific or integrity boundary remains unresolved.</p>}
    <div className="debrief-actions">
      <button type="button" className="btn" onClick={onExport}><Download size={16} aria-hidden="true" />บันทึกไฟล์ JSON</button>
      {onPrint && <button type="button" className="btn quiet" onClick={onPrint}><Printer size={16} aria-hidden="true" />พิมพ์รายงาน</button>}
      {onReport && <button type="button" className="btn quiet" onClick={onReport}><FileText size={16} aria-hidden="true" />เปิดหน้ารายงาน</button>}
      <button type="button" className="btn quiet" onClick={onReset}><RotateCcw size={16} aria-hidden="true" />เล่นใหม่อีกรอบ</button>
    </div>
    {reportId && <p className="debrief-note">เลขอ้างอิง <span className="data">{reportId}</span></p>}
  </section>;
}

export function StepActions({ back, next, nextLabel = 'Commit and continue', disabled = false, disabledReason }: {
  back?: () => void;
  next: () => void;
  nextLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return <div className="step-actions">
    {back ? <button type="button" className="btn quiet" onClick={back}>ย้อนกลับ</button> : <span />}
    <div className="step-actions-forward">{disabled && disabledReason && <small className="step-actions-reason" role="status">{disabledReason}</small>}<button type="button" className="btn" onClick={next} disabled={disabled}>{nextLabel}</button></div>
  </div>;
}
