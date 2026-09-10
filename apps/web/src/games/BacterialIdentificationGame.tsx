import { CheckCircle2, ClipboardList, Info, Microscope, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { BACTERIAL_CASES, EDUCATIONAL_PROFILE, HYPOTHESES, MEDIA_BY_ID, MEDIA_ORIENTATION } from './content';
import { budgetFor, rulesFor, type DifficultyRules } from './difficulty';
import { evaluateBacterialDecision, lintBacterialConclusion, observationMatches, type BacterialDecision } from './engine';
import { CampaignNav, Debrief, DifficultyNote, EvidenceRail, PhaseHeading, SimulationHeader, StepActions } from './GameChrome';
import LabScene, { type VesselState } from './LabScene';
import { audit, exportPacket, saveEvidencePacket, useLocalGameState, validateImportedProfile, saveImportedProfile } from './persistence';
import type { AuditEvent, BacterialCase, BacterialConclusion, CultureObservation, EvidenceItem, GameDifficulty, GameRole, MediaId } from './types';
import './games.css';

type Phase = 'campaign' | 'orientation' | 'briefing' | 'hypotheses' | 'planning' | 'observation' | 'evidence' | 'conclusion' | 'debrief';
type CaseState = {
  phase: Phase;
  caseNumber: number;
  variantIndex: number;
  role: GameRole;
  difficulty: GameDifficulty;
  twoD: boolean;
  orientation: Partial<Record<MediaId, string>>;
  orientationChecked: boolean;
  hypotheses: string[];
  controls: string[];
  selectedMedia: MediaId[];
  activeMedium: MediaId;
  observations: Partial<Record<MediaId, CultureObservation>>;
  draft: CultureObservation;
  conclusion: BacterialConclusion;
  confidence: 'low' | 'moderate' | 'high';
  nextAction: string;
  rationale: string;
  chainOfCustodyValid: boolean;
  mixedCultureAcknowledged: boolean;
  observationCommitted: boolean;
  originalObservation: string;
  correctionReason: string;
  audit: AuditEvent[];
  completed: number[];
  bestScores: Record<string, number>;
  errorSignals: Record<string, number>;
  showGlossary: boolean;
  statusMessage: string;
  reportId?: string;
};

const blankObservation = (medium: MediaId): CultureObservation => ({ medium, growth: 'equivocal', abundance: 'not_applicable', reaction: 'not_applicable', morphotypes: 0, confidence: 'moderate', ...(medium === 'TSB' || medium === 'RV' ? { brothState: 'equivocal' as const } : {}) });

const INITIAL: CaseState = {
  phase: 'campaign', caseNumber: 0, variantIndex: 0, role: 'learner', difficulty: 'standard', twoD: false, orientation: {}, orientationChecked: false,
  hypotheses: [], controls: [], selectedMedia: [], activeMedium: 'TSB', observations: {}, draft: blankObservation('TSB'), conclusion: 'cannot_resolve', confidence: 'moderate',
  nextAction: 'confirm-approved', rationale: '', chainOfCustodyValid: true, mixedCultureAcknowledged: false, observationCommitted: false, originalObservation: '', correctionReason: '', audit: [], completed: [], bestScores: {}, errorSignals: {}, showGlossary: false, statusMessage: ''
};

const roleOptions = ['broth ฟื้นเชื้อแบบกว้าง', 'จานอ่านผลเชื้อรา', 'จาน selective/differential', 'broth สำหรับ selective enrichment'];
const caseVariantLabels = ['หลักฐานพื้นฐาน', 'บริบทตัวอย่างแบบอื่น', 'การอ่านผลที่สีตัดกันน้อย'];

function getCase(number: number) { return BACTERIAL_CASES.find((item) => item.number === number) || BACTERIAL_CASES[0]; }
function selectedCase(base: BacterialCase, variantIndex: number): BacterialCase {
  if (variantIndex === 0) return base;
  return { ...base, seed: `${base.seed}-V${variantIndex + 1}`, title: `${base.title} · ${caseVariantLabels[variantIndex] || 'รูปแบบการเล่นใหม่'}`, sample: variantIndex === 1 ? `${base.sample} · alternate context` : `${base.sample} · controlled lighting variant` };
}

function observationText(observation: CultureObservation) {
  if (observation.brothState) return `${observation.brothState} broth state`;
  return `${observation.growth}; ${observation.abundance}; ${observation.reaction.replaceAll('_', ' ')}; ${observation.morphotypes} morphotype(s)`;
}

function sceneState(medium: MediaId, observation: CultureObservation | undefined, phase: Phase): VesselState {
  if (phase !== 'observation' && phase !== 'evidence' && phase !== 'conclusion' && phase !== 'debrief') return 'clear';
  if (!observation) return medium === 'TSB' || medium === 'RV' ? 'equivocal' : 'clear';
  if (observation.brothState) return observation.brothState === 'turbid' ? 'turbid' : observation.brothState === 'equivocal' ? 'equivocal' : 'clear';
  if (medium === 'MSA') return observation.reaction === 'yellowing' ? 'msa-yellow' : 'msa-red';
  if (medium === 'MAC') return observation.morphotypes === 2 ? 'mixed-growth' : observation.reaction === 'pink_red' ? 'mac-pink' : 'mac-pale';
  if (medium === 'XLD') return observation.reaction === 'black_center' ? 'xld-black' : 'xld-red';
  if (medium === 'SDA') return observation.reaction === 'mold_filamentous' ? 'sda-mold' : observation.reaction === 'yeast_cream' ? 'sda-yeast' : 'colonies';
  return 'colonies';
}

function availableReactions(medium: MediaId) {
  if (medium === 'MSA') return [['not_applicable', 'ไม่ได้บันทึกปฏิกิริยา'], ['yellowing', 'พื้นปฏิกิริยาสีเหลือง'], ['unchanged', 'พื้นสีแดง/ชมพู ไม่เปลี่ยน']];
  if (medium === 'MAC') return [['not_applicable', 'ไม่ได้บันทึกปฏิกิริยา'], ['pink_red', 'โคโลนีสีชมพู/แดง'], ['pale_colorless', 'โคโลนีสีซีด/ไม่มีสี']];
  if (medium === 'XLD') return [['not_applicable', 'ไม่ได้บันทึกปฏิกิริยา'], ['yellowing', 'โคโลนี/พื้นสีเหลือง'], ['red_pink', 'โคโลนีสีแดง/ชมพู'], ['black_center', 'สีแดง/ชมพู ตรงกลางดำ'], ['atypical', 'รูปแบบผิดปกติ']];
  if (medium === 'SDA') return [['not_applicable', 'ไม่มีลักษณะโคโลนีที่ชัดเจน'], ['yeast_cream', 'สีครีม ลักษณะคล้ายยีสต์'], ['mold_filamentous', 'เป็นเส้นใย ลักษณะคล้ายรา']];
  return [['not_applicable', 'ไม่ใช้กับ broth']];
}

export default function BacterialIdentificationGame() {
  const { theme } = useOutletContext<{ theme: string }>();
  const navigate = useNavigate();
  const [state, setState, reset, hydrated] = useLocalGameState<CaseState>('anf3.games.sixthplate.v2', INITIAL);
  const [profileMessage, setProfileMessage] = useState('');
  const baseCase = getCase(state.caseNumber);
  const currentCase = selectedCase(baseCase, state.variantIndex % caseVariantLabels.length);
  /* The chosen level is what sets the budget, the hints and the penalty. */
  const rules = rulesFor(state.difficulty);
  const actionBudget = budgetFor(currentCase.actionBudget, state.difficulty);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phaseStation: Record<Phase, 'receiving' | 'planning' | 'incubator' | 'observation' | 'review'> = { campaign: 'receiving', orientation: 'planning', briefing: 'receiving', hypotheses: 'review', planning: 'planning', observation: 'observation', evidence: 'review', conclusion: 'review', debrief: 'review' };
  const chooseCase = (number: number, variantIndex = state.variantIndex) => setState((value) => ({ ...INITIAL, phase: number === 0 ? 'orientation' : 'briefing', caseNumber: number, variantIndex, role: value.role, difficulty: value.difficulty, twoD: value.twoD, completed: value.completed, bestScores: value.bestScores, errorSignals: value.errorSignals, showGlossary: value.showGlossary, statusMessage: `Case ${number} opened.` }));
  const chooseVariant = (number: number, variantIndex: number) => setState((value) => ({ ...value, caseNumber: number, variantIndex, statusMessage: 'เลือกรูปแบบเล่นใหม่แล้ว เริ่มเคสเพื่อใช้งาน' }));
  const updateRole = (role: GameRole) => setState((value) => ({ ...value, role, statusMessage: role === 'instructor' ? 'เครื่องมือผู้สอนแสดงเฉพาะในเครื่องนี้ ไม่ใช่การยืนยันตัวตน' : 'กลับสู่มุมมองผู้เรียนแล้ว' }));
  const updateDifficulty = (difficulty: GameDifficulty) => setState((value) => ({ ...value, difficulty, showGlossary: rulesFor(difficulty).glossaryOpen, statusMessage: rulesFor(difficulty).who }));
  const advance = (phase: Phase, action: string, detail: string) => setState((value) => ({ ...value, phase, audit: [...value.audit, audit(action, detail)], statusMessage: detail }));

  const decision: BacterialDecision = {
    hypotheses: state.hypotheses, observations: state.observations, conclusion: state.conclusion, confidence: state.confidence, nextAction: state.nextAction, rationale: state.rationale,
    controls: state.controls,
    selectedMedia: state.selectedMedia, chainOfCustodyValid: state.chainOfCustodyValid, mixedCultureAcknowledged: state.mixedCultureAcknowledged,
    corrections: state.correctionReason ? [{ field: state.activeMedium, original: state.originalObservation, amended: observationText(state.draft), reason: state.correctionReason }] : undefined
  };
  const linter = lintBacterialConclusion(decision, { scenario: currentCase, sequence: state.selectedMedia });
  const score = evaluateBacterialDecision(currentCase.truth, decision, { scenario: currentCase, sequence: state.selectedMedia, criticalCeiling: rules.criticalCeiling, criticalPenalty: rules.criticalPenalty });
  const collectedMedia = state.selectedMedia.filter((medium) => state.observations[medium]);
  const evidence = useMemo<EvidenceItem[]>(() => collectedMedia.map((medium, index) => {
    const observation = state.observations[medium]!;
    const expected = currentCase.truth[medium];
    const objectiveMatch = expected ? observationMatches(expected, observation) : false;
    const chain = currentCase.chainOfCustodyValid && state.chainOfCustodyValid ? 'linked' : 'broken';
    return { id: `${medium}-OBS-${String(index + 1).padStart(2, '0')}`, source: `${MEDIA_BY_ID[medium].name} · ${medium}`, observation: observationText(observation), interpretation: state.phase === 'debrief' ? (objectiveMatch ? 'ช่องผลตามจริงตรงกับสภาพในสถานการณ์' : 'ช่องผลตามจริงไม่ตรงกับสภาพในสถานการณ์') : 'เก็บผลตามจริงไว้ ส่วนการตีความจะตรวจหลังส่ง', validity: chain === 'broken' ? 'invalid' : objectiveMatch ? 'valid' : 'equivocal', confidence: observation.confidence, chainOfCustody: chain };
  }), [collectedMedia, currentCase, state]);

  const commitObservation = () => {
    const medium = state.activeMedium;
    const next = { ...state.observations, [medium]: state.draft };
    const remaining = state.selectedMedia.find((item) => !next[item]);
    const summary = observationText(state.draft);
    const amended = Boolean(state.observations[medium]);
    if (amended && state.correctionReason.trim().length < 8) { setState((value) => ({ ...value, statusMessage: 'ระบุเหตุผลก่อนแก้ผลที่บันทึกไว้' })); return; }
    setState((value) => ({ ...value, observations: next, phase: remaining ? 'observation' : 'evidence', activeMedium: remaining || medium, draft: remaining ? blankObservation(remaining) : value.draft, observationCommitted: true, originalObservation: amended ? value.originalObservation : summary, audit: [...value.audit, audit(amended ? 'แก้ผลบันทึกแล้ว' : 'บันทึกผลตามจริงแล้ว', amended ? `${value.correctionReason}: ${value.originalObservation} -> ${summary}` : `${medium}: ${summary}`)], statusMessage: remaining ? `Observation saved. Open ${remaining}.` : 'ผลที่เลือกทั้งหมดพร้อมตรวจหลักฐาน' }));
  };
  const selectMedium = (medium: MediaId) => setState((value) => ({ ...value, activeMedium: medium, draft: value.observations[medium] || blankObservation(medium), originalObservation: value.observations[medium] ? observationText(value.observations[medium]!) : '', correctionReason: '' }));
  const buildPacket = () => ({ schemaVersion: 2 as const, simulation: 'The Sixth Plate: แฟ้มคดีจุลชีววิทยา', profileId: EDUCATIONAL_PROFILE.id, trainingOnly: true as const, campaignId: 'sixth-plate', scenarioId: currentCase.id, scenarioTitle: currentCase.title, exportedAt: new Date().toISOString(), role: state.role, difficulty: state.difficulty, decision, evidence, audit: state.audit, score, notes: linter });
  const saveReport = async () => { const saved = await saveEvidencePacket(buildPacket()); setState((value) => ({ ...value, reportId: saved.id, statusMessage: 'บันทึกรายงานในเครื่องแล้ว พร้อมพิมพ์' })); return saved.id!; };
  const downloadPacket = () => { const packet = exportPacket(buildPacket(), `sixth-plate-${currentCase.seed}.json`); setState((value) => ({ ...value, reportId: packet.id, statusMessage: 'JSON packet exported.' })); };
  const printReport = async () => { const id = await saveReport(); navigate(`/games/report/${id}`); };
  const resetRun = () => { if (window.confirm('เริ่มรอบใหม่ไหม เคสในเครื่องตอนนี้จะถูกล้าง')) reset(); };
  const vessel = currentCase.truth[state.activeMedium]?.brothState !== undefined || state.activeMedium === 'TSB' || state.activeMedium === 'RV' ? 'tube' as const : 'plate' as const;
  const vesselObservation = currentCase.truth[state.activeMedium];
  const inspectVessel = () => {
    setState((value) => ({ ...value, audit: [...value.audit, audit('ตรวจภาชนะแล้ว', `${MEDIA_BY_ID[state.activeMedium].name} examined on the bench.`)], statusMessage: 'ตรวจที่โต๊ะปฏิบัติการแล้ว' }));
  };

  const sceneDescription = state.phase === 'orientation' ? 'ตู้อาหารเลี้ยงเชื้อ มีภาชนะติดฉลาก 6 ใบ: broth 2 และ agar 4 จาน' : state.phase === 'observation' || state.phase === 'evidence' || state.phase === 'conclusion' || state.phase === 'debrief' ? `${MEDIA_BY_ID[state.activeMedium].name} ${vessel === 'tube' ? 'tube' : 'plate'} shows a scenario-controlled objective state. Record visible evidence before interpretation.` : 'ภาพห้องแล็บมุมคงที่ มีสถานีรับตัวอย่าง วางแผน อ่านผล และทบทวน';

  return <div className="sim-shell" data-accent="identification">
    <SimulationHeader title="The Sixth Plate · แฟ้มคดีจุลชีววิทยา" phase={state.phase} code={state.phase === 'campaign' ? 'CAMPAIGN' : currentCase.id} autosaved={hydrated} twoD={state.twoD} onToggle2D={() => setState((value) => ({ ...value, twoD: !value.twoD }))} role={state.role} difficulty={state.difficulty} onRoleChange={updateRole} onDifficultyChange={updateDifficulty} />
    {state.phase !== 'campaign' && <CampaignNav items={BACTERIAL_CASES.map((item) => ({ id: item.id, label: item.shortTitle, complete: state.completed.includes(item.number) }))} active={currentCase.id} onSelect={(id) => chooseCase(Number(id.match(/case-(\d+)/)?.[1] || 0))} />}
    <div className="sim-grid">
      <section className="sim-main" aria-label="พื้นที่จำลอง">
        <div className="sim-breadcrumb"><Link to="/games">← กลับหน้าเกม</Link><span>{state.phase === 'campaign' ? 'แคมเปญ 9 เคส · ปลดล็อกทุกแฟ้ม' : `Case ${currentCase.number} of 8 · ${rules.label} · Actions ${collectedMedia.length}/${actionBudget}`}</span></div>
        {state.statusMessage && <p className="sim-status" role="status"><Info size={15} aria-hidden="true" />{state.statusMessage}</p>}
        {state.phase !== 'campaign' && <LabScene station={phaseStation[state.phase]} vessel={state.phase === 'orientation' ? 'plate' : vessel} vesselState={state.phase === 'orientation' ? 'clear' : sceneState(state.activeMedium, vesselObservation, state.phase)} description={sceneDescription} twoD={state.twoD} dark={theme === 'dark'} reducedMotion={reducedMotion} seed={`${currentCase.seed}-${state.activeMedium}`} onInspect={inspectVessel} />}
        {state.phase === 'campaign' && <CaseCampaignScreen state={state} onChoose={chooseCase} onVariant={chooseVariant} onRole={updateRole} onGlossary={(showGlossary) => setState((value) => ({ ...value, showGlossary }))} profileMessage={profileMessage} setProfileMessage={setProfileMessage} />}
        {state.phase === 'orientation' && <CaseOrientation state={state} setState={setState} onReview={() => setState((value) => ({ ...value, orientationChecked: true, audit: [...value.audit, audit('ทบทวนการแนะนำอาหารเลี้ยงเชื้อแล้ว', 'จัดบทบาทอาหารเลี้ยงเชื้อครบ 6 แล้ว')] }))} onContinue={() => setState((value) => ({ ...value, phase: 'campaign', completed: value.completed.includes(0) ? value.completed : [...value.completed, 0], statusMessage: 'จบเคส 0 แล้ว เปิดแฟ้มเคสใดก็ได้' }))} />}
        {state.phase === 'briefing' && <CaseBriefing currentCase={currentCase} state={state} setState={setState} onContinue={() => advance('hypotheses', 'รับทราบแฟ้มเคสแล้ว', currentCase.question)} />}
        {state.phase === 'hypotheses' && <HypothesisScreen currentCase={currentCase} state={state} setState={setState} onContinue={() => advance('planning', 'บันทึกสมมติฐานแล้ว', state.hypotheses.join(', '))} />}
        {state.phase === 'planning' && <MediaPlanning currentCase={currentCase} state={state} setState={setState} rules={rules} actionBudget={actionBudget} onContinue={() => { const first = state.selectedMedia[0]; setState((value) => ({ ...value, phase: 'observation', activeMedium: first, draft: value.observations[first] || blankObservation(first), audit: [...value.audit, audit('บันทึกแผนอาหารเลี้ยงเชื้อแล้ว', value.selectedMedia.join(' → '))], statusMessage: 'เปิดลำดับอาหารเลี้ยงเชื้อที่กำหนดไว้แล้ว' })); }} />}
        {state.phase === 'observation' && <ObservationScreen currentCase={currentCase} state={state} setState={setState} selectMedium={selectMedium} onCommit={commitObservation} />}
        {state.phase === 'evidence' && <EvidenceScreen currentCase={currentCase} state={state} evidence={evidence} onContinue={() => advance('conclusion', 'ตรวจกระดานหลักฐานแล้ว', `${evidence.length} observations linked to the case.`)} />}
        {state.phase === 'conclusion' && <ConclusionScreen currentCase={currentCase} state={state} setState={setState} evidence={evidence} linter={linter} rules={rules} onAmend={() => setState((value) => ({ ...value, phase: 'observation', draft: value.observations[value.activeMedium] || blankObservation(value.activeMedium), statusMessage: 'แก้ผลที่บันทึกไว้ พร้อมบันทึกเหตุผล' }))} onSubmit={() => setState((value) => ({ ...value, phase: 'debrief', completed: value.completed.includes(currentCase.number) ? value.completed : [...value.completed, currentCase.number], bestScores: { ...value.bestScores, [currentCase.id]: rules.keepBestAttempt ? Math.max(value.bestScores[currentCase.id] || 0, score.total) : (value.bestScores[currentCase.id] ?? score.total) }, errorSignals: score.criticalErrors.reduce((signals, error) => ({ ...signals, [error]: (signals[error] || 0) + 1 }), value.errorSignals), audit: [...value.audit, audit('ส่งข้อสรุปแล้ว', `${value.conclusion}; ${value.confidence}; ${value.nextAction}.`)], statusMessage: 'ส่งข้อสรุปให้ผู้ตรวจ QA แล้ว' }))} />}
        {state.phase === 'debrief' && <Debrief score={score} supported={`${currentCase.maximumClaim} · ${currentCase.supportedNextAction}`} chosen={state.conclusion.replaceAll('_', ' ')} principle={currentCase.principle} onExport={downloadPacket} onPrint={printReport} onReport={printReport} reportId={state.reportId} onReset={resetRun} />}
      </section>
      {state.phase !== 'campaign' && <EvidenceRail evidence={evidence} auditEvents={state.audit} status="Select a medium, record an objective observation, then commit it here." />}
    </div>
    <footer className="sim-disclaimer"><Microscope size={15} aria-hidden="true" />Educational simulation only. Media reactions are simplified, scenario-controlled evidence. Real isolates can be atypical; confirm under the current approved procedure.</footer>
  </div>;
}

function CaseCampaignScreen({ state, onChoose, onVariant, onRole, onGlossary, profileMessage, setProfileMessage }: { state: CaseState; onChoose: (number: number, variantIndex?: number) => void; onVariant: (number: number, variantIndex: number) => void; onRole: (role: GameRole) => void; onGlossary: (show: boolean) => void; profileMessage: string; setProfileMessage: (message: string) => void }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const importProfile = async (file: File) => { try { const value = JSON.parse(await file.text()); if (!validateImportedProfile(value)) throw new Error('profile ต้องเป็นแบบฝึกอบรมเท่านั้น และมีนิยามอาหารเลี้ยงเชื้อที่ถูกต้อง 6 รายการพอดี'); await saveImportedProfile(value); setProfileMessage(`Imported ${value.displayName}. The campaign remains training-only.`); } catch (error) { setProfileMessage(error instanceof Error ? error.message : 'นำเข้า profile ไม่สำเร็จ'); } };
  const signalEntries = Object.entries(state.errorSignals).sort(([, left], [, right]) => right - left);
  return <section className="panel campaign-panel">
    <div className="campaign-intro">
      <div><PhaseHeading title="ตามหลักฐานไปจนข้อสรุปมีขอบเขตชัด" description="เปิดเคสไหนก่อนก็ได้ เลือกรูปแบบการเล่น และแยกหลักฐานทางชีวภาพออกจากเรื่องการสอบกลับและความมั่นใจ" /></div>
      <div className="campaign-ledger"><strong className="data">{state.completed.length}/9</strong><span>คดีที่ตรวจแล้ว</span><small>{!Object.keys(state.bestScores).length ? 'ยังไม่มีคะแนน' : rulesFor(state.difficulty).keepBestAttempt ? 'เก็บคะแนนดีที่สุดไว้ในเครื่อง' : 'เก็บคะแนนครั้งแรกไว้ในเครื่อง'}</small></div>
    </div>
    <DifficultyNote difficulty={state.difficulty} />
    <div className="record-list">{BACTERIAL_CASES.map((item) => <article key={item.id} className={`record-row ${state.completed.includes(item.number) ? 'is-complete' : ''}`}>
      <div className="record-index data">{String(item.number).padStart(2, '0')}</div>
      <div><span className="record-eyebrow">Case {String(item.number).padStart(2, '0')}</span><h2>{item.title}</h2><p>{item.briefing}</p><small className="data">{item.availableMedia.map((media) => `${media} · ${MEDIA_BY_ID[media].form}`).join('   ')}</small></div>
      <div className="record-action"><label><span>รูปแบบการเล่นใหม่</span><select aria-label={`Replay variant for ${item.title}`} value={state.caseNumber === item.number ? state.variantIndex : 0} onChange={(event) => onVariant(item.number, Number(event.target.value))}>{caseVariantLabels.map((label, index) => <option key={label} value={index}>{index + 1} · {label}</option>)}</select></label><button type="button" className="btn" onClick={() => onChoose(item.number, state.caseNumber === item.number ? state.variantIndex : 0)}>{state.completed.includes(item.number) ? 'เล่นเคสใหม่' : 'เปิดเคส'}</button></div>
    </article>)}</div>
    <div className="campaign-tools"><button type="button" className="btn quiet" onClick={() => setToolsOpen((value) => !value)}><ShieldCheck size={16} aria-hidden="true" />เครื่องมือผู้สอน</button>{state.role !== 'instructor' && <button type="button" className="btn quiet" onClick={() => onRole('instructor')}>สลับไปมุมมองผู้สอน</button>}</div>
    {toolsOpen && <section className="panel-inset" aria-label="เครื่องมือผู้สอน"><h2>เครื่องมือผู้สอน</h2><p>สลับบทบาทในเครื่องนี้เท่านั้น ไม่ใช่การยืนยันตัวตน และไม่ได้ต่อกับบันทึกจริง LIMS หรือข้อมูลจริง</p><label className="check-row"><input type="checkbox" checked={state.showGlossary} onChange={(event) => onGlossary(event.target.checked)} />แสดงอภิธานศัพท์ในหน้าสรุปงาน</label><label className="file-control"><span>นำเข้าไฟล์ JSON ของ profile ฝึกอบรมที่อนุมัติ</span><input type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProfile(file); }} /></label>{signalEntries.length > 0 && <div className="signal-list"><strong>สัญญาณแนะนำในเครื่อง</strong>{signalEntries.map(([signal, count]) => <span key={signal} className="data">{count} · {signal}</span>)}</div>}{profileMessage && <p className="inline-feedback" role="status">{profileMessage}</p>}</section>}
  </section>;
}

function CaseOrientation({ state, setState, onReview, onContinue }: { state: CaseState; setState: React.Dispatch<React.SetStateAction<CaseState>>; onReview: () => void; onContinue: () => void }) {
  return <section className="panel">
    <PhaseHeading title="ภาชนะ 6 ใบ บทบาทหลักฐาน 4 แบบ" description="Classify each item before opening the case files. TSB and RV are broths; SDA is a fungal observation plate, not a definitive bacterial identification agar." />
    <div className="media-orientation">{MEDIA_ORIENTATION.map(({ id, expected }) => <label key={id}><span><strong>{id}</strong><small>{MEDIA_BY_ID[id].name} · {MEDIA_BY_ID[id].form}</small></span><select aria-label={`Role for ${id}`} value={state.orientation[id] || ''} onChange={(event) => setState((value) => ({ ...value, orientation: { ...value.orientation, [id]: event.target.value }, orientationChecked: false }))}><option value="">เลือกบทบาท…</option>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select>{state.orientationChecked && <i className={state.orientation[id] === expected ? 'is-ok' : 'is-review'}>{state.orientation[id] === expected ? 'Correct' : `Expected: ${expected}`}</i>}</label>)}</div>
    {!state.orientationChecked ? <StepActions next={onReview} nextLabel="Review classification" disabled={Object.keys(state.orientation).length < 6} disabledReason="Classify all six vessels before review." /> : <StepActions next={onContinue} nextLabel="Return to case files" />}
  </section>;
}

function CaseBriefing({ currentCase, state, setState, onContinue }: { currentCase: BacterialCase; state: CaseState; setState: React.Dispatch<React.SetStateAction<CaseState>>; onContinue: () => void }) {
  return <section className="panel field-report">
    <span className="stamp-mark">สมมติ<br />Case {String(currentCase.number).padStart(2, '0')}</span>
    <PhaseHeading title={currentCase.title} description={currentCase.briefing} />
    <dl className="fact-grid"><div><dt>คำถาม</dt><dd>{currentCase.question}</dd></div><div><dt>ตัวอย่าง</dt><dd>{currentCase.sample}</dd></div><div><dt>รายการที่มีอยู่</dt><dd>{currentCase.availableMedia.map((media) => MEDIA_BY_ID[media].name).join(', ')}</dd></div><div><dt>ข้อสรุปสูงสุดที่อ้างได้</dt><dd>{currentCase.maximumClaim}</dd></div></dl>
    <div className="notice"><ClipboardList size={20} aria-hidden="true" /><p><strong>Dr. Mira Voss:</strong> Do not tell me which name looks familiar. Tell me how far this evidence permits us to speak.</p></div>
    <fieldset className="choice-set"><legend>ตรวจสอบ chain of custody</legend><label className="check-row"><input aria-label="การเชื่อมโยงตัวอย่างครบถ้วน" type="checkbox" checked={state.chainOfCustodyValid} onChange={(event) => setState((value) => ({ ...value, chainOfCustodyValid: event.target.checked }))} />การเชื่อมโยงตัวอย่างครบถ้วน</label><small>{currentCase.chainOfCustodyValid ? 'ไทม์ไลน์ของเคสถูกตั้งให้เชื่อมโยงกัน' : 'ไทม์ไลน์ของเคสมีการสลับฉลาก เอาเครื่องหมายออกเพื่อคงข้อบกพร่องนี้ไว้'}</small></fieldset>
    {state.showGlossary && <section className="inline-glossary" aria-label="อภิธานศัพท์"><h2>อภิธานศัพท์</h2><dl><div><dt>สันนิษฐาน</dt><dd>ข้อสรุปจากรูปแบบที่จำกัดขอบเขต ยังต้องยืนยันด้วยวิธีที่อนุมัติ</dd></div><div><dt>Chain of custody</dt><dd>การเชื่อมโยงระหว่างตัวอย่าง ภาชนะ และหลักฐานที่บันทึกไว้</dd></div><div><dt>Enrichment</dt><dd>ขั้นเพิ่มจำนวนเชื้อแบบเลือกชนิด ค่าที่ได้ต้องอ่านผ่านหลักฐานขั้นถัดไปที่เชื่อมกันไว้</dd></div></dl></section>}
    <StepActions next={onContinue} nextLabel="Build hypotheses" />
  </section>;
}

function HypothesisScreen({ currentCase, state, setState, onContinue }: { currentCase: BacterialCase; state: CaseState; setState: React.Dispatch<React.SetStateAction<CaseState>>; onContinue: () => void }) {
  const hypotheses = HYPOTHESES.filter((item) => currentCase.hypotheses.includes(item.id));
  return <section className="panel">
    <PhaseHeading title="อย่าเพิ่งตัดคำอธิบายอื่นทิ้ง" description="Select two to five candidates. The board records a starting set, not a final answer." />
    <div className="hypothesis-grid">{hypotheses.map((hypothesis) => <label key={hypothesis.id} className={state.hypotheses.includes(hypothesis.id) ? 'is-selected' : ''}><input type="checkbox" checked={state.hypotheses.includes(hypothesis.id)} onChange={() => setState((value) => ({ ...value, hypotheses: value.hypotheses.includes(hypothesis.id) ? value.hypotheses.filter((id) => id !== hypothesis.id) : [...value.hypotheses, hypothesis.id] }))} /><span><strong>{hypothesis.label}</strong><small>Maximum claim: {hypothesis.maximum}</small><em>Could increase: {hypothesis.increasesWith}</em></span></label>)}</div>
    <StepActions next={onContinue} nextLabel="Plan evidence" disabled={state.hypotheses.length < 2 || state.hypotheses.length > 5} disabledReason="Select between two and five hypotheses." />
  </section>;
}

function MediaPlanning({ currentCase, state, setState, rules, actionBudget, onContinue }: { currentCase: BacterialCase; state: CaseState; setState: React.Dispatch<React.SetStateAction<CaseState>>; rules: DifficultyRules; actionBudget: number; onContinue: () => void }) {
  const canSelect = (medium: MediaId) => medium === 'XLD' && currentCase.requiredSequence.includes('RV') ? state.selectedMedia.includes('RV') : true;
  const controlsReady = ['positive', 'uninoculated'].every((control) => state.controls.includes(control));
  const complete = currentCase.requiredSequence.every((medium) => state.selectedMedia.includes(medium)) && state.selectedMedia.length > 0 && controlsReady;
  return <section className="panel">
    <PhaseHeading title="เลือกการกระทำที่ให้หลักฐาน" description={`เลือกอาหารเลี้ยงเชื้อ 1 อย่าง = 1 action ระดับ ${rules.label} มี ${actionBudget} action ผลที่คาดไว้ยังไม่แสดง`} />
    <div className="media-cabinet">{currentCase.availableMedia.map((medium) => { const selected = state.selectedMedia.includes(medium); const locked = !selected && (state.selectedMedia.length >= actionBudget || !canSelect(medium)); return <button type="button" key={medium} className={`${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`} disabled={locked} onClick={() => setState((value) => ({ ...value, selectedMedia: selected ? value.selectedMedia.filter((item) => item !== medium) : [...value.selectedMedia, medium] }))}><span className={`media-vessel ${MEDIA_BY_ID[medium].form}`} aria-hidden="true" /><span><strong>{medium}</strong><small>{MEDIA_BY_ID[medium].name} · {MEDIA_BY_ID[medium].form}</small>{rules.showMediaPurpose && <em>{MEDIA_BY_ID[medium].role}</em>}{rules.showMediaPurpose && <em className="media-boundary">{MEDIA_BY_ID[medium].boundary}</em>}{rules.showSequenceHint && medium === 'XLD' && currentCase.requiredSequence.includes('RV') && !state.selectedMedia.includes('RV') && <i>ต้องผ่าน RV ก่อน</i>}</span><b className="data">{selected ? 'Planned' : `+1 action · เหลือ ${actionBudget - state.selectedMedia.length}`}</b></button>; })}</div>
    <fieldset className="choice-set"><legend>Control ที่ต้องมีใน session</legend>{['positive', 'uninoculated'].map((control) => <label className="check-row is-required" key={control}><input aria-label={control === 'positive' ? 'Positive control ของการเจริญ' : 'Control อาหารเลี้ยงเชื้อที่ไม่ใส่เชื้อ'} type="checkbox" checked={state.controls.includes(control)} onChange={() => setState((value) => ({ ...value, controls: value.controls.includes(control) ? value.controls.filter((item) => item !== control) : [...value.controls, control] }))} />{control === 'positive' ? 'Positive control ของการเจริญ' : 'Control อาหารเลี้ยงเชื้อที่ไม่ใส่เชื้อ'}<b>required</b></label>)}</fieldset>
    {rules.showMediaPurpose && <div className="notice"><ShieldAlert size={19} aria-hidden="true" /><p>{currentCase.requiredSequence.includes('RV') ? 'RV is a selective enrichment broth. Its meaning depends on the linked downstream XLD observation.' : 'A selective or differential reaction narrows a hypothesis; it does not prove species identity.'}</p></div>}
    <StepActions next={onContinue} nextLabel="Open observation station" disabled={!complete} disabledReason={!controlsReady ? 'เลือกทั้ง positive control และ control ที่ไม่ใส่เชื้อ' : !currentCase.requiredSequence.length ? 'เลือกอาหารเลี้ยงเชื้ออย่างน้อย 1 อย่าง' : rules.showSequenceHint ? `ยังขาดลำดับที่ต้องมี: ${currentCase.requiredSequence.filter((medium) => !state.selectedMedia.includes(medium)).join(' → ')}` : 'แผนนี้ยังไม่ครอบคลุมลำดับที่คดีนี้ต้องใช้'} />
  </section>;
}

function ObservationScreen({ currentCase, state, setState, selectMedium, onCommit }: { currentCase: BacterialCase; state: CaseState; setState: React.Dispatch<React.SetStateAction<CaseState>>; selectMedium: (medium: MediaId) => void; onCommit: () => void }) {
  const medium = state.activeMedium;
  const isBroth = medium === 'TSB' || medium === 'RV';
  const reactions = availableReactions(medium);
  const amend = Boolean(state.observations[medium]);
  return <section className="panel">
    <PhaseHeading title={amend ? 'แก้ผลที่บันทึกไปแล้ว' : 'บันทึกสภาพที่มองเห็น'} description={isBroth ? 'Broth evidence uses clear, equivocal, or turbid states. Turbidity is not an organism identity.' : 'บันทึกการเจริญ ปฏิกิริยา และ morphotype ก่อนตีความ'} />
    <div className="observation-toolbar"><div>{state.selectedMedia.map((item) => <button type="button" key={item} className={item === medium ? 'is-active' : ''} onClick={() => selectMedium(item)}>{item}{state.observations[item] && <CheckCircle2 size={14} aria-hidden="true" />}</button>)}</div><button type="button" className="btn quiet sm" onClick={() => setState((value) => ({ ...value, audit: [...value.audit, audit('ต้องบรรยายตามที่เห็น', `${medium}: ${observationText(currentCase.truth[medium] || blankObservation(medium))}`)], statusMessage: `Objective description requested for ${medium}.` }))}><Search size={15} aria-hidden="true" />บรรยายตามที่เห็น</button></div>
    {isBroth ? <div className="observation-grid"><label>สถานะของ broth<select value={state.draft.brothState || 'equivocal'} onChange={(event) => { const brothState = event.target.value as 'clear' | 'equivocal' | 'turbid'; setState((value) => ({ ...value, draft: { ...value.draft, brothState, growth: brothState === 'clear' ? 'none_visible' : brothState === 'turbid' ? 'present' : 'equivocal' } })); }}><option value="clear">ใส / ไม่เห็นการเปลี่ยนแปลง</option><option value="equivocal">ก้ำกึ่ง / เปลี่ยนแปลงเล็กน้อย</option><option value="turbid">ขุ่น / เห็นการเจริญ</option></select></label><label>ปริมาณการเจริญ<select value={state.draft.abundance} onChange={(event) => setState((value) => ({ ...value, draft: { ...value.draft, abundance: event.target.value as CultureObservation['abundance'] } }))}><option value="not_applicable">ไม่ใช้</option><option value="sparse">บาง</option><option value="moderate">ปานกลาง</option><option value="heavy">หนาแน่น</option></select></label><label>ความมั่นใจในการอ่านผล<select value={state.draft.confidence} onChange={(event) => setState((value) => ({ ...value, draft: { ...value.draft, confidence: event.target.value as CultureObservation['confidence'] } }))}><option value="high">สูง</option><option value="moderate">ปานกลาง</option><option value="low">Low</option></select></label></div> : <div className="observation-grid"><label>เห็นการเจริญ<select value={state.draft.growth} onChange={(event) => setState((value) => ({ ...value, draft: { ...value.draft, growth: event.target.value as CultureObservation['growth'] } }))}><option value="none_visible">ไม่เห็นการเจริญ</option><option value="present">มี</option><option value="equivocal">ก้ำกึ่ง</option></select></label><label>ปริมาณการเจริญ<select value={state.draft.abundance} onChange={(event) => setState((value) => ({ ...value, draft: { ...value.draft, abundance: event.target.value as CultureObservation['abundance'] } }))}><option value="not_applicable">ไม่ใช้</option><option value="sparse">บาง</option><option value="moderate">ปานกลาง</option><option value="heavy">หนาแน่น</option></select></label><label>ปฏิกิริยา<select value={state.draft.reaction} onChange={(event) => setState((value) => ({ ...value, draft: { ...value.draft, reaction: event.target.value as CultureObservation['reaction'] } }))}>{reactions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Morphotype<select value={state.draft.morphotypes} onChange={(event) => setState((value) => ({ ...value, draft: { ...value.draft, morphotypes: Number(event.target.value) as 0 | 1 | 2 } }))}><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></label><label>ความมั่นใจในการอ่านผล<select value={state.draft.confidence} onChange={(event) => setState((value) => ({ ...value, draft: { ...value.draft, confidence: event.target.value as CultureObservation['confidence'] } }))}><option value="high">สูง</option><option value="moderate">ปานกลาง</option><option value="low">Low</option></select></label></div>}
    {amend && <label className="rationale-field"><span>เหตุผลที่แก้ไข</span><textarea value={state.correctionReason} maxLength={240} onChange={(event) => setState((value) => ({ ...value, correctionReason: event.target.value }))} placeholder="อธิบายว่าทำไมต้องแก้ผลที่บันทึกไปแล้ว" /><small>Original entry: {state.originalObservation}</small></label>}
    <StepActions next={onCommit} nextLabel={amend ? 'บันทึกผลที่แก้แล้ว' : 'บันทึกผล'} disabled={amend && state.correctionReason.trim().length < 8} disabledReason="A correction reason is required." />
  </section>;
}

function EvidenceScreen({ currentCase, state, evidence, onContinue }: { currentCase: BacterialCase; state: CaseState; evidence: EvidenceItem[]; onContinue: () => void }) {
  const hypothesisLabels = HYPOTHESES.filter((item) => state.hypotheses.includes(item.id));
  return <section className="panel">
    <PhaseHeading title="แยกหลักฐานที่เห็นออกจากการตีความ" description="The wall shows only what has been collected. Calibrated support and penalties are revealed at QA review." />
    <div className="evidence-matrix"><div className="matrix-head"><span>หลักฐาน</span>{hypothesisLabels.map((hypothesis) => <strong key={hypothesis.id}>{hypothesis.label}</strong>)}</div>{evidence.map((item) => <div className="matrix-row" key={item.id}><span><strong className="data">{item.id}</strong><small>{item.observation}</small></span>{hypothesisLabels.map((hypothesis) => <b className="pending" key={hypothesis.id}>review</b>)}</div>)}</div>
    <p className="matrix-note">Weights are deterministic ordinal support, not fake probability. Invalid chain-of-custody evidence is excluded during review.</p>
    <StepActions next={onContinue} nextLabel="Draft conclusion report" />
  </section>;
}

function ConclusionScreen({ currentCase, state, setState, evidence, linter, rules, onAmend, onSubmit }: { currentCase: BacterialCase; state: CaseState; setState: React.Dispatch<React.SetStateAction<CaseState>>; evidence: EvidenceItem[]; linter: string[]; rules: DifficultyRules; onAmend: () => void; onSubmit: () => void }) {
  const validConclusion = state.rationale.trim().length >= 20 && /\[[A-Z0-9-]+\]/i.test(state.rationale);
  /* The live linter is the beginner's safety net. At review and expert the
     conclusion is committed blind and the findings appear at the debrief —
     which is the point of the level. */
  const submit = () => {
    if (rules.warnBeforeSubmit && linter.length > 0
      && !window.confirm(`ตัวตรวจรายงานพบ ${linter.length} ข้อ:\n\n${linter.join('\n')}\n\nส่งแบบนี้เลยไหม`)) return;
    onSubmit();
  };
  return <section className="panel">
    <PhaseHeading title="พูดได้เท่าที่หลักฐานรองรับ" description={rules.warnBeforeSubmit ? `${currentCase.question} ตัวตรวจรายงานจะเตือนก่อนส่ง` : `${currentCase.question} ระดับ${rules.label}ส่งโดยไม่มีคำเตือน ผลตรวจจะแสดงตอนสรุปงาน`} />
    <fieldset className="choice-set"><legend>ระดับข้อสรุป</legend><select value={state.conclusion} onChange={(event) => setState((value) => ({ ...value, conclusion: event.target.value as BacterialConclusion }))}><option value="presumptive_staph_like">สันนิษฐานเป็นเชื้อ Staphylococcus-like ทนเกลือ และ mannitol positive</option><option value="presumptive_lactose_fermenter">สันนิษฐานเป็นเชื้อ Gram-negative ที่หมัก lactose / เข้าได้กับกลุ่มลำไส้</option><option value="presumptive_salmonella_like">รูปแบบสันนิษฐาน Salmonella-like</option><option value="presumptive_non_lactose_enteric">สันนิษฐานเป็นเชื้อที่ไม่หมัก lactose เข้าได้กับกลุ่มลำไส้</option><option value="non_bacterial_suspected">สงสัยว่าไม่ใช่แบคทีเรีย หรือเป็นเชื้อคล้ายรา</option><option value="mixed_culture">สงสัยเชื้อปนหรือความบริสุทธิ์มีปัญหา</option><option value="cannot_resolve">อาหารเลี้ยงเชื้อที่มีอยู่สรุปไม่ได้</option><option value="definitive_s_aureus">ระบุเป็น Staphylococcus aureus</option></select></fieldset>
    <div className="observation-grid"><label>ระดับความมั่นใจของข้อสรุป<select value={state.confidence} onChange={(event) => setState((value) => ({ ...value, confidence: event.target.value as CaseState['confidence'] }))}><option value="low">Low</option><option value="moderate">ปานกลาง</option><option value="high">สูง</option></select></label><label>สิ่งที่ต้องทำต่อ<select value={state.nextAction} onChange={(event) => setState((value) => ({ ...value, nextAction: event.target.value }))}><option value="confirm-approved">ยืนยันตามวิธีพิสูจน์เอกลักษณ์ที่อนุมัติ</option><option value="repeat-invalid">ทำซ้ำเพราะหลักฐานใช้ไม่ได้</option><option value="resolve-chain">แก้ปัญหา chain of custody ไม่ตรงกัน</option><option value="separate-mixed">แยกเชื้อที่ปนกันด้วยขั้นตอนทำให้บริสุทธิ์แบบย่อ</option><option value="qa-escalation">ส่งต่อ QA / หัวหน้าห้องแล็บ</option><option value="none">ไม่ต้องดำเนินการเพิ่ม</option></select></label></div>
    <label className="check-row"><input type="checkbox" checked={state.mixedCultureAcknowledged} onChange={(event) => setState((value) => ({ ...value, mixedCultureAcknowledged: event.target.checked }))} />พิจารณาแล้วว่าตัวอย่างอาจมี morphotype ปนกัน</label>
    <label className="rationale-field"><span>Evidence-linked rationale · {state.rationale.length}/600</span><textarea maxLength={600} value={state.rationale} onChange={(event) => setState((value) => ({ ...value, rationale: event.target.value }))} placeholder={`Example: [${evidence[0]?.id || 'MAC-OBS-01'}] shows… therefore…`} /><small>Available IDs: {evidence.map((item) => `[${item.id}]`).join(' ')}</small></label>
    {rules.warnBeforeSubmit && linter.length > 0 && <div className="notice notice--danger" role="status"><ShieldAlert size={19} aria-hidden="true" /><div><strong>ตัวตรวจรายงาน</strong>{linter.map((finding) => <p key={finding}>{finding}</p>)}</div></div>}
    <div className="amend-row"><button type="button" className="btn quiet sm" onClick={onAmend}>แก้ผลบันทึก</button></div>
    <StepActions next={submit} nextLabel="Submit to Quinn, QA reviewer" disabled={!validConclusion} disabledReason="Write at least 20 characters and cite one collected evidence ID." />
  </section>;
}
