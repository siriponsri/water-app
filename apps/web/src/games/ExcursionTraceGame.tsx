import { ArrowDown, ArrowUp, Info, ShieldAlert, ShieldCheck, TriangleAlert, Waypoints } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fellerCorrected } from '../appData';
import { CampaignNav, Debrief, DifficultyNote, EvidenceRail, PhaseHeading, SimulationHeader, StepActions } from './GameChrome';
import { audit, exportPacket, saveEvidencePacket, useLocalGameState } from './persistence';
import {
  ACTION_LIMITS, CAPA_OPTIONS, EXCURSION_CASES, GRADES, METHOD_LABELS, SAMPLE_POINT_BY_ID,
  TRAINING_FIXTURE_NOTICE, excursionCaseByNumber
} from './excursionContent';
import { rulesFor, type DifficultyRules } from './difficulty';
import { correctedCount, custodyInvalidIds, evaluateExcursionDecision, trueExceedanceIds } from './excursionEngine';
import type { ExcursionDecision } from './excursionTypes';
import type { AuditEvent, EvidenceItem, GameDifficulty, GameRole } from './types';
import './games.css';

type Phase = 'campaign' | 'orientation' | 'briefing' | 'flagging' | 'sequencing' | 'capa' | 'debrief';

type ExcursionState = {
  phase: Phase;
  caseNumber: number;
  role: GameRole;
  difficulty: GameDifficulty;
  orientationGuess: Record<string, string>;
  orientationChecked: boolean;
  flaggedIds: string[];
  revealedCorrections: string[];
  revealedLimits: string[];
  orderedPathIds: string[];
  noPathAsserted: boolean;
  custodyAcknowledged: boolean;
  capaId: string;
  rationale: string;
  audit: AuditEvent[];
  completed: number[];
  bestScores: Record<string, number>;
  statusMessage: string;
  reportId?: string;
};

const INITIAL: ExcursionState = {
  phase: 'campaign', caseNumber: 0, role: 'learner', difficulty: 'standard', orientationGuess: {}, orientationChecked: false,
  flaggedIds: [], revealedCorrections: [], revealedLimits: [], orderedPathIds: [], noPathAsserted: false, custodyAcknowledged: false, capaId: '',
  rationale: '', audit: [], completed: [], bestScores: {}, statusMessage: ''
};

const runDefaults = (caseNumber: number, previous: ExcursionState): ExcursionState => ({
  ...INITIAL, phase: caseNumber === 0 ? 'orientation' : 'briefing', caseNumber, role: previous.role, difficulty: previous.difficulty,
  completed: previous.completed, bestScores: previous.bestScores
});

const ORIENTATION_SAMPLE = ['p-d-corridor', 'p-airlock2', 'p-rabs-face', 'p-mech-gallery'];

function getCase(number: number) {
  return excursionCaseByNumber(number);
}

/** A hand-built inline floor plan for the fixture facility. Purely visual —
 *  aria-hidden — every point it marks also exists as a real button in the
 *  list beside it, and clicking a marker calls the same handler. */
function FloorPlan({ points, flaggedIds, orderIndex, activeId }: {
  points: string[];
  flaggedIds: string[];
  orderIndex?: Record<string, number>;
  activeId?: string;
}) {
  const rooms = [
    { label: 'Corridor D-1 (Grade D)', x: 2, y: 2, w: 20, h: 96, fill: 'var(--color-paper-2)' },
    { label: 'Airlock 1', x: 22, y: 36, w: 10, h: 28, fill: 'var(--color-paper-3)' },
    { label: 'Gowning & support (Grade C)', x: 32, y: 2, w: 20, h: 96, fill: 'var(--color-paper-3)' },
    { label: 'Airlock 2', x: 52, y: 36, w: 10, h: 28, fill: 'var(--color-paper-3)' },
    { label: 'Corridor B-1 (Grade B)', x: 62, y: 2, w: 22, h: 96, fill: 'var(--color-paper)' },
    { label: 'Filling suite (Grade A)', x: 84, y: 20, w: 14, h: 60, fill: 'var(--color-paper)' }
  ];
  const subRooms = [
    { label: 'ช่องเดินงานระบบ', x: 34, y: 4, w: 16, h: 22 },
    { label: 'ช่องท่อ/สายที่ทะลุผนัง', x: 34, y: 74, w: 16, h: 20 }
  ];
  return <svg className="floor-plan-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {rooms.map((room) => <g key={room.label}>
      <rect x={room.x} y={room.y} width={room.w} height={room.h} style={{ fill: room.fill, stroke: 'var(--color-rule)', strokeWidth: 0.4 }} />
      <text x={room.x + 1.5} y={room.y + 4} style={{ fill: 'var(--color-muted)', font: '2.1px var(--font-data)' }}>{room.label}</text>
    </g>)}
    <rect x={84} y={20} width={14} height={60} style={{ fill: 'none', stroke: 'var(--color-accent)', strokeWidth: 0.7 }} />
    {subRooms.map((room) => <g key={room.label}>
      <rect x={room.x} y={room.y} width={room.w} height={room.h} style={{ fill: 'var(--color-paper-2)', stroke: 'var(--color-rule-2)', strokeWidth: 0.35, strokeDasharray: '1.2 0.9' }} />
      <text x={room.x + 1.2} y={room.y + 3.6} style={{ fill: 'var(--color-neutral)', font: '1.7px var(--font-data)' }}>{room.label}</text>
    </g>)}
    {points.map((id) => {
      const point = SAMPLE_POINT_BY_ID[id];
      if (!point) return null;
      const flagged = flaggedIds.includes(id);
      const order = orderIndex?.[id];
      const active = activeId === id;
      const fill = flagged ? 'var(--color-danger)' : 'var(--color-neutral)';
      return <g key={id} transform={`translate(${point.x} ${point.y})`}>
        {active && <circle r={3.4} style={{ fill: 'none', stroke: 'var(--color-accent)', strokeWidth: 0.5 }} />}
        <circle r={order ? 2.6 : 1.7} style={{ fill }} />
        {order && <text y={0.7} textAnchor="middle" style={{ fill: 'var(--color-accent-ink)', font: '2.4px var(--font-data)', fontWeight: 600 }}>{order}</text>}
      </g>;
    })}
  </svg>;
}

export default function ExcursionTraceGame() {
  const navigate = useNavigate();
  const [state, setState, reset, hydrated] = useLocalGameState<ExcursionState>('anf3.games.excursiontrace.v1', INITIAL);
  const scenario = getCase(state.caseNumber);
  const readingIds = Object.keys(scenario.readings);

  const advance = (phase: Phase, action: string, detail: string) => setState((value) => ({ ...value, phase, audit: [...value.audit, audit(action, detail)], statusMessage: detail }));
  const chooseCase = (number: number) => setState((value) => runDefaults(number, value));
  const updateRole = (role: GameRole) => setState((value) => ({ ...value, role, statusMessage: role === 'instructor' ? 'เครื่องมือผู้สอนแสดงเฉพาะในเครื่องนี้ ไม่ใช่การยืนยันตัวตน' : 'กลับสู่มุมมองผู้เรียนแล้ว' }));
  const updateDifficulty = (difficulty: GameDifficulty) => setState((value) => ({ ...value, difficulty, statusMessage: rulesFor(difficulty).who }));

  const decision: ExcursionDecision = {
    flaggedIds: state.flaggedIds, orderedPathIds: state.orderedPathIds, noPathAsserted: state.noPathAsserted,
    custodyAcknowledged: state.custodyAcknowledged, capaId: state.capaId, rationale: state.rationale
  };
  const rules = rulesFor(state.difficulty);
  const score = state.phase === 'debrief' || state.phase === 'capa' ? evaluateExcursionDecision(scenario, decision, { criticalCeiling: rules.criticalCeiling, criticalPenalty: rules.criticalPenalty }) : { domains: [], total: 0, criticalErrors: [] as string[] };
  const truth = useMemo(() => trueExceedanceIds(scenario), [scenario]);
  const invalidExceedances = useMemo(() => custodyInvalidIds(scenario), [scenario]);

  const evidence = useMemo<EvidenceItem[]>(() => {
    if (state.phase === 'campaign' || state.phase === 'orientation' || state.phase === 'briefing') return [];
    const items: EvidenceItem[] = [];
    for (const id of state.flaggedIds) {
      const point = SAMPLE_POINT_BY_ID[id];
      const reading = scenario.readings[id];
      if (!point || !reading) continue;
      const corrected = correctedCount(point, reading);
      const isTrue = truth.includes(id);
      const custodyBroken = reading.chainOfCustodyValid === false;
      items.push({
        id: `EM-${id}`,
        source: `${point.label} · ${point.room}`,
        observation: point.method === 'active_air' ? `${reading.count} of ${reading.totalHoles} holes positive · corrected ${corrected} CFU vs limit ${ACTION_LIMITS[point.grade][point.method]}` : `${reading.count} CFU (${METHOD_LABELS[point.method]}) vs limit ${ACTION_LIMITS[point.grade][point.method]}`,
        interpretation: state.phase === 'debrief' ? (custodyBroken ? 'การเชื่อมโยงตัวอย่างขาด — ใช้เป็นหลักฐานที่สะอาดไม่ได้' : isTrue ? 'ยืนยันว่าเกินเกณฑ์' : 'ค่าอ่านได้อยู่ในค่าจำกัดในโจทย์ — ทำเครื่องหมายผิด') : undefined,
        validity: custodyBroken ? 'invalid' : isTrue ? 'valid' : 'equivocal',
        chainOfCustody: custodyBroken ? 'broken' : 'linked'
      });
    }
    if (['sequencing', 'capa', 'debrief'].includes(state.phase)) items.push({ id: 'PATH-01', source: 'เส้นทางเข้าของการปนเปื้อน', observation: state.noPathAsserted ? 'ยังไม่ได้ระบุเส้นทางที่สอดคล้องกัน' : state.orderedPathIds.length ? state.orderedPathIds.map((id) => SAMPLE_POINT_BY_ID[id]?.label || id).join(' → ') : 'ยังไม่ได้เรียงเส้นทาง', validity: 'valid' });
    if (['capa', 'debrief'].includes(state.phase) && state.capaId) items.push({ id: 'CAPA-01', source: 'CAPA selection', observation: CAPA_OPTIONS.find((option) => option.id === state.capaId)?.label || state.capaId, validity: state.phase === 'debrief' ? (state.capaId === scenario.supportedCapaId ? 'valid' : 'invalid') : 'equivocal' });
    return items;
  }, [scenario, state.flaggedIds, state.phase, state.noPathAsserted, state.orderedPathIds, state.capaId, truth]);

  const buildPacket = () => ({ schemaVersion: 2 as const, simulation: 'Excursion Trace: สืบสวนห้องสะอาด', profileId: 'anf3-excursion-trace-fixture-2026-09', trainingOnly: true as const, campaignId: 'excursion-trace', scenarioId: scenario.id, scenarioTitle: scenario.title, exportedAt: new Date().toISOString(), role: state.role, difficulty: state.difficulty, decision, evidence, audit: state.audit, score });
  const saveReport = async () => { const saved = await saveEvidencePacket(buildPacket()); setState((value) => ({ ...value, reportId: saved.id, statusMessage: 'บันทึกรายงานในเครื่องแล้ว พร้อมพิมพ์' })); return saved.id!; };
  const downloadPacket = () => { const packet = exportPacket(buildPacket(), `excursion-trace-${scenario.seed || scenario.id}.json`); setState((value) => ({ ...value, reportId: packet.id, statusMessage: 'JSON packet exported.' })); };
  const printReport = async () => { const id = await saveReport(); navigate(`/games/report/${id}`); };
  const resetRun = () => { if (window.confirm('เริ่มรอบใหม่ไหม ข้อมูลรอบนี้ในเครื่องจะถูกล้าง')) reset(); };

  const submitCapa = () => setState((value) => ({
    ...value, phase: 'debrief',
    completed: value.completed.includes(scenario.number) ? value.completed : [...value.completed, scenario.number],
    bestScores: { ...value.bestScores, [scenario.id]: rules.keepBestAttempt ? Math.max(value.bestScores[scenario.id] || 0, evaluateExcursionDecision(scenario, decision, { criticalCeiling: rules.criticalCeiling, criticalPenalty: rules.criticalPenalty }).total) : (value.bestScores[scenario.id] ?? evaluateExcursionDecision(scenario, decision, { criticalCeiling: rules.criticalCeiling, criticalPenalty: rules.criticalPenalty }).total) },
    audit: [...value.audit, audit('CAPA submitted', `${value.capaId}.`)], statusMessage: 'ส่งชุดหลักฐานให้ผู้ตรวจ QA แล้ว'
  }));

  return <div className="sim-shell" data-accent="excursion">
    <SimulationHeader title="Excursion Trace · สืบสวนห้องสะอาด" phase={state.phase} code={state.phase === 'campaign' ? 'CAMPAIGN' : scenario.id} autosaved={hydrated} role={state.role} difficulty={state.difficulty} onRoleChange={updateRole} onDifficultyChange={updateDifficulty} />
    {state.phase !== 'campaign' && <CampaignNav items={EXCURSION_CASES.map((item) => ({ id: item.id, label: item.shortTitle, complete: state.completed.includes(item.number) }))} active={scenario.id} onSelect={(id) => { const match = EXCURSION_CASES.find((item) => item.id === id); if (match) chooseCase(match.number); }} />}
    <div className="sim-grid">
      <section className="sim-main" aria-label="พื้นที่จำลอง">
        <div className="sim-breadcrumb"><Link to="/games">← กลับหน้าเกม</Link><span>{state.phase === 'campaign' ? 'แคมเปญ 7 รอบ · ปลดล็อกทุกรอบ' : `Round ${scenario.number} of 6`}</span></div>
        {state.statusMessage && <p className="sim-status" role="status"><Info size={15} aria-hidden="true" />{state.statusMessage}</p>}

        {state.phase === 'campaign' && <CampaignScreen state={state} onChoose={chooseCase} onRole={updateRole} />}
        {state.phase === 'orientation' && <OrientationScreen state={state} setState={setState} onReview={() => setState((value) => ({ ...value, orientationChecked: true, audit: [...value.audit, audit('ทบทวนผังจุดเก็บในโจทย์ แล้ว', 'จัด Grade และวิธีก่อนเริ่มรอบแล้ว')] }))} onContinue={() => setState((value) => ({ ...value, phase: 'campaign', completed: value.completed.includes(0) ? value.completed : [...value.completed, 0], statusMessage: 'จบปฐมนิเทศแล้ว ปลดล็อกทุกรอบ' }))} />}
        {state.phase === 'briefing' && !scenario.orientationOnly && <BriefingScreen state={state} onContinue={() => advance('flagging', 'เปิดรอบแล้ว', `EM readings opened for ${scenario.title}.`)} />}
        {state.phase === 'flagging' && <FlaggingScreen state={state} setState={setState} readingIds={readingIds} rules={rules} onContinue={() => advance('sequencing', 'บันทึกการคัดกรองแล้ว', `${state.flaggedIds.length} point(s) flagged.`)} />}
        {state.phase === 'sequencing' && <SequencingScreen state={state} setState={setState} onContinue={() => advance('capa', 'บันทึกเส้นทางแล้ว', state.noPathAsserted ? 'ยังไม่ได้ระบุเส้นทางที่สอดคล้องกัน' : state.orderedPathIds.join(' → ') || 'ไม่ได้เรียงเส้นทาง')} />}
        {state.phase === 'capa' && <CapaScreen state={state} setState={setState} invalidExceedances={invalidExceedances} evidence={evidence} onSubmit={submitCapa} />}
        {state.phase === 'debrief' && <Debrief score={score} supported={`${CAPA_OPTIONS.find((option) => option.id === scenario.supportedCapaId)?.label}`} chosen={CAPA_OPTIONS.find((option) => option.id === state.capaId)?.label || state.capaId} principle={scenario.principle} onExport={downloadPacket} onPrint={printReport} onReport={printReport} reportId={state.reportId} onReset={resetRun} />}
      </section>
      {state.phase !== 'campaign' && state.phase !== 'orientation' && <EvidenceRail evidence={evidence} auditEvents={state.audit} status="ทำเครื่องหมายจุดที่เกินเกณฑ์ เพื่อเริ่มเก็บหลักฐาน" />}
    </div>
    <footer className="sim-disclaimer"><Waypoints size={15} aria-hidden="true" />{TRAINING_FIXTURE_NOTICE}<ShieldCheck size={15} aria-hidden="true" /></footer>
  </div>;
}

function CampaignScreen({ state, onChoose, onRole }: { state: ExcursionState; onChoose: (number: number) => void; onRole: (role: GameRole) => void }) {
  return <section className="panel campaign-panel">
    <div className="campaign-intro">
      <div><PhaseHeading title="คัดกรองผลอ่านก่อนเชื่อเรื่องราว" description="Six fictional rounds on one fixture facility. Every reading is deterministic and replayable, and nothing here is an approved EM programme." /></div>
      <div className="campaign-ledger"><strong className="data">{state.completed.length}/7</strong><span>รอบที่ตรวจแล้ว</span><small>{!Object.keys(state.bestScores).length ? 'ยังไม่มีคะแนน' : rulesFor(state.difficulty).keepBestAttempt ? 'เก็บคะแนนดีที่สุดไว้ในเครื่อง' : 'เก็บคะแนนครั้งแรกไว้ในเครื่อง'}</small></div>
    </div>
    <DifficultyNote difficulty={state.difficulty} />
    <div className="record-list">{EXCURSION_CASES.map((item) => <article key={item.id} className={`record-row ${state.completed.includes(item.number) ? 'is-complete' : ''}`}>
      <div className="record-index data">{String(item.number).padStart(2, '0')}</div>
      <div><span className="record-eyebrow">{item.orientationOnly ? 'ปฐมนิเทศ' : `Round ${item.number}`}</span><h2>{item.title}</h2><p>{item.briefing}</p></div>
      <div className="record-action"><button type="button" className="btn" onClick={() => onChoose(item.number)}>{state.completed.includes(item.number) ? 'เล่นรอบใหม่' : item.orientationOnly ? 'เริ่มปฐมนิเทศ' : 'เริ่มรอบ'}</button></div>
    </article>)}</div>
    <div className="campaign-tools">{state.role !== 'instructor' && <button type="button" className="btn quiet" onClick={() => onRole('instructor')}><ShieldCheck size={16} aria-hidden="true" />สลับไปมุมมองผู้สอน</button>}</div>
  </section>;
}

function OrientationScreen({ state, setState, onReview, onContinue }: { state: ExcursionState; setState: React.Dispatch<React.SetStateAction<ExcursionState>>; onReview: () => void; onContinue: () => void }) {
  return <section className="panel">
    <PhaseHeading title="อ่านผังจุดเก็บในโจทย์ ก่อนเริ่มรอบแรก" description="Four marked points on the facility plan below. Name each one’s grade before you triage a live round." />
    <div className="floor-plan"><FloorPlan points={ORIENTATION_SAMPLE} flaggedIds={[]} /></div>
    <div className="orientation-grid">{ORIENTATION_SAMPLE.map((id) => {
      const point = SAMPLE_POINT_BY_ID[id];
      return <label key={id}><span><strong>{point.label}</strong><small>{point.room} · {METHOD_LABELS[point.method]}</small></span>
        <select aria-label={`Grade for ${point.label}`} value={state.orientationGuess[id] || ''} onChange={(event) => setState((value) => ({ ...value, orientationGuess: { ...value.orientationGuess, [id]: event.target.value }, orientationChecked: false }))}>
          <option value="">เลือก Grade…</option>{GRADES.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
        </select>
        {state.orientationChecked && <small className={state.orientationGuess[id] === point.grade ? 'is-ok' : 'is-review'}>{state.orientationGuess[id] === point.grade ? 'Grade ถูกต้อง' : `Review: ${point.grade}`}</small>}
      </label>;
    })}</div>
    <div className="notice"><ShieldAlert size={18} aria-hidden="true" /><p>{TRAINING_FIXTURE_NOTICE}</p></div>
    {!state.orientationChecked ? <StepActions next={onReview} nextLabel="Review classification" disabled={Object.keys(state.orientationGuess).length < ORIENTATION_SAMPLE.length} disabledReason="Grade all four marked points before review." /> : <StepActions next={onContinue} nextLabel="Return to rounds" />}
  </section>;
}

function BriefingScreen({ state, onContinue }: { state: ExcursionState; onContinue: () => void }) {
  const scenario = getCase(state.caseNumber);
  return <section className="panel field-report">
    <span className="stamp-mark">สมมติ<br />Round {scenario.number}</span>
    <PhaseHeading title={scenario.title} description={scenario.briefing} />
    <dl className="fact-grid"><div><dt>คำถาม</dt><dd>{scenario.question}</dd></div><div><dt>จุดที่เก็บตัวอย่าง</dt><dd className="data">{Object.keys(scenario.readings).length}</dd></div></dl>
    <StepActions next={onContinue} nextLabel="Open EM readings" />
  </section>;
}

function FlaggingScreen({ state, setState, readingIds, rules, onContinue }: { state: ExcursionState; setState: React.Dispatch<React.SetStateAction<ExcursionState>>; readingIds: string[]; rules: DifficultyRules; onContinue: () => void }) {
  const scenario = getCase(state.caseNumber);
  const toggle = (id: string) => setState((value) => ({ ...value, flaggedIds: value.flaggedIds.includes(id) ? value.flaggedIds.filter((item) => item !== id) : [...value.flaggedIds, id] }));
  const reveal = (id: string) => setState((value) => ({ ...value, revealedCorrections: value.revealedCorrections.includes(id) ? value.revealedCorrections : [...value.revealedCorrections, id], audit: [...value.audit, audit('คำนวณ Feller correction แล้ว', `${SAMPLE_POINT_BY_ID[id].label}: corrected estimate revealed.`)] }));
  /* At expert the limit is not printed beside the reading: you are expected
     to know it, and looking it up is an action the audit trail records. */
  const showLimit = (id: string) => rules.showMediaPurpose || state.revealedLimits.includes(id);
  const revealLimit = (id: string) => setState((value) => ({ ...value, revealedLimits: value.revealedLimits.includes(id) ? value.revealedLimits : [...value.revealedLimits, id], audit: [...value.audit, audit('เปิดดูค่าจำกัด', `${SAMPLE_POINT_BY_ID[id].label}: limit looked up.`)] }));
  return <section className="panel">
    <PhaseHeading title="จุดไหนเกินค่าจำกัดในโจทย์" description={rules.showMediaPurpose ? 'Flag every point whose reading clears its training-only action limit. Active-air points need the Feller correction applied before you can trust the raw hole count.' : `ระดับ${rules.label}: ไม่แสดงค่าจำกัดและไม่เตือน chain of custody กดดูค่าจำกัดได้ แต่จะถูกบันทึกใน audit trail`} />
    <div className="floor-plan"><FloorPlan points={readingIds} flaggedIds={state.flaggedIds} /></div>
    <ul className="point-list">{readingIds.map((id) => {
      const point = SAMPLE_POINT_BY_ID[id];
      const reading = scenario.readings[id];
      const limit = ACTION_LIMITS[point.grade][point.method];
      const revealed = state.revealedCorrections.includes(id);
      const corrected = point.method === 'active_air' && reading.totalHoles ? fellerCorrected(reading.count, reading.totalHoles) : reading.count;
      return <li key={id} className="point-row">
        <label className="check-row"><input type="checkbox" checked={state.flaggedIds.includes(id)} onChange={() => toggle(id)} aria-label={`Flag ${point.label} as exceeding`} /><span><strong>{point.label}</strong><small>{point.room} · Grade {point.grade} · {METHOD_LABELS[point.method]}</small></span></label>
        <div className="point-reading data">
          {point.method === 'active_air' ? <>
            <span>{reading.count} / {reading.totalHoles} holes</span>
            {reading.totalHoles && (revealed ? <span>corrected {corrected}{showLimit(id) ? ` (limit ${limit})` : ''}</span> : <button type="button" className="btn quiet sm" onClick={() => reveal(id)}>ใช้ Feller correction</button>)}
          </> : <span>{reading.count} CFU{showLimit(id) ? ` (limit ${limit})` : ''}</span>}
          {!showLimit(id) && <button type="button" className="btn quiet sm" onClick={() => revealLimit(id)}>ดูค่าจำกัด</button>}
          {rules.showMediaPurpose && reading.chainOfCustodyValid === false && <span className="data flag-warn"><TriangleAlert size={13} aria-hidden="true" />สายโยงตัวอย่างขาด</span>}
        </div>
      </li>;
    })}</ul>
    <StepActions next={onContinue} nextLabel="Commit triage" />
  </section>;
}

function SequencingScreen({ state, setState, onContinue }: { state: ExcursionState; setState: React.Dispatch<React.SetStateAction<ExcursionState>>; onContinue: () => void }) {
  const move = (id: string, direction: -1 | 1) => setState((value) => {
    const index = value.orderedPathIds.indexOf(id);
    const swapWith = index + direction;
    if (index < 0 || swapWith < 0 || swapWith >= value.orderedPathIds.length) return value;
    const next = [...value.orderedPathIds];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    return { ...value, orderedPathIds: next };
  });
  const addToPath = (id: string) => setState((value) => ({ ...value, noPathAsserted: false, orderedPathIds: value.orderedPathIds.includes(id) ? value.orderedPathIds : [...value.orderedPathIds, id] }));
  const removeFromPath = (id: string) => setState((value) => ({ ...value, orderedPathIds: value.orderedPathIds.filter((item) => item !== id) }));
  const orderIndex = Object.fromEntries(state.orderedPathIds.map((id, index) => [id, index + 1]));

  if (state.flaggedIds.length === 0) return <section className="panel">
    <PhaseHeading title="ไม่มีจุดที่ทำเครื่องหมายไว้" description="With no exceedance flagged, there is no ingress path to reconstruct." />
    <StepActions back={() => setState((value) => ({ ...value, phase: 'flagging' }))} next={() => { setState((value) => ({ ...value, noPathAsserted: true, orderedPathIds: [] })); onContinue(); }} nextLabel="Confirm no path" />
  </section>;

  return <section className="panel">
    <PhaseHeading title="เรียงเส้นทางเข้าที่เป็นไปได้มากที่สุด" description="Add the flagged points that belong to one rising trail, in order. Leave out anything that does not share that trail." />
    <div className="floor-plan"><FloorPlan points={state.flaggedIds} flaggedIds={state.flaggedIds} orderIndex={orderIndex} /></div>
    <div className="path-builder">
      <div>
        <h3>จุดที่ทำเครื่องหมายไว้</h3>
        <ul className="point-list compact">{state.flaggedIds.map((id) => <li key={id} className="point-row"><span><strong>{SAMPLE_POINT_BY_ID[id].label}</strong><small>{SAMPLE_POINT_BY_ID[id].room}</small></span><button type="button" className="btn quiet sm" disabled={state.orderedPathIds.includes(id)} onClick={() => addToPath(id)}>เพิ่มลงเส้นทาง</button></li>)}</ul>
      </div>
      <div>
        <h3>เส้นทางเข้าของการปนเปื้อน</h3>
        {state.orderedPathIds.length === 0 ? <p className="point-list-empty">ยังไม่ได้เพิ่มจุด</p> : <ol className="point-list compact">{state.orderedPathIds.map((id, index) => <li key={id} className="point-row"><span className="data">{index + 1}</span><span><strong>{SAMPLE_POINT_BY_ID[id].label}</strong></span><span className="path-controls"><button type="button" className="btn quiet sm icon-only" disabled={index === 0} onClick={() => move(id, -1)} aria-label={`Move ${SAMPLE_POINT_BY_ID[id].label} earlier`}><ArrowUp size={14} aria-hidden="true" /></button><button type="button" className="btn quiet sm icon-only" disabled={index === state.orderedPathIds.length - 1} onClick={() => move(id, 1)} aria-label={`Move ${SAMPLE_POINT_BY_ID[id].label} later`}><ArrowDown size={14} aria-hidden="true" /></button><button type="button" className="btn quiet sm" onClick={() => removeFromPath(id)}>นำออก</button></span></li>)}</ol>}
      </div>
    </div>
    <label className="check-row"><input type="checkbox" checked={state.noPathAsserted} onChange={(event) => setState((value) => ({ ...value, noPathAsserted: event.target.checked, orderedPathIds: event.target.checked ? [] : value.orderedPathIds }))} />เป็นสิ่งที่พบแยกกัน — ไม่มีเส้นทางเข้าที่เชื่อมโยงกัน</label>
    <StepActions next={onContinue} nextLabel="Commit path" />
  </section>;
}

function CapaScreen({ state, setState, invalidExceedances, evidence, onSubmit }: { state: ExcursionState; setState: React.Dispatch<React.SetStateAction<ExcursionState>>; invalidExceedances: string[]; evidence: EvidenceItem[]; onSubmit: () => void }) {
  const needsCustodyAck = invalidExceedances.length > 0;
  const canSubmit = Boolean(state.capaId) && state.rationale.trim().length >= 20 && /\[[A-Z0-9-]+\]/i.test(state.rationale) && (!needsCustodyAck || state.custodyAcknowledged);
  return <section className="panel">
    <PhaseHeading title="หลักฐานนี้รองรับข้อสรุปใด" description="Choose the CAPA the flagged points and the path actually justify — not the most cautious-sounding option." />
    <fieldset className="choice-set"><legend>CAPA</legend>{CAPA_OPTIONS.map((option) => <label className="radio-card" key={option.id}><input type="radio" name="capa" checked={state.capaId === option.id} onChange={() => setState((value) => ({ ...value, capaId: option.id }))} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></label>)}</fieldset>
    {needsCustodyAck && <label className="check-row is-required"><input type="checkbox" checked={state.custodyAcknowledged} onChange={(event) => setState((value) => ({ ...value, custodyAcknowledged: event.target.checked }))} />ตัดผลที่ chain of custody ขาด ออกจากหลักฐานรองรับ CAPA นี้แล้ว<b>required</b></label>}
    <label className="rationale-field"><span>Evidence-linked rationale · {state.rationale.length}/600</span><textarea maxLength={600} value={state.rationale} onChange={(event) => setState((value) => ({ ...value, rationale: event.target.value }))} placeholder={`Example: [${evidence[0]?.id || 'EM-p-airlock2'}] shows… therefore…`} /><small>Available IDs: {evidence.map((item) => `[${item.id}]`).join(' ')}</small></label>
    <StepActions next={onSubmit} nextLabel="Submit CAPA" disabled={!canSubmit} disabledReason={!state.capaId ? 'เลือก CAPA' : needsCustodyAck && !state.custodyAcknowledged ? 'รับทราบว่าผลนี้ chain of custody ขาด' : 'เขียนอย่างน้อย 20 ตัวอักษร และอ้าง ID ของหลักฐานที่เก็บได้'} />
  </section>;
}

