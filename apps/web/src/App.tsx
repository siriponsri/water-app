import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, CircleHelp, Download, ExternalLink,
  Info, Lock, Maximize2, Moon, Printer, RefreshCw, Save, Search, Sun, Undo2, Wifi, WifiOff, X
} from 'lucide-react';
import {
  Link, Navigate, Outlet, RouterProvider, createHashRouter, useLocation, useNavigate,
  useOutletContext, useParams, useSearchParams
} from 'react-router-dom';
import printJS from 'print-js';
import { endpointConfigured, getSystemRecord, searchSystem } from './api';
import type { RecordFilters } from './api';
import { activeBinders, binderById, binderForContext, binderInstances, buildingGroups, calendarId, domains, shelfBinders, tools, workflowById, workflows } from './appData';
import type { BinderInstance, BuildingGroupId, Tool, Workflow } from './appData';
import { getCachedRecord, getCachedSearch, putCachedRecord, putCachedSearch } from './storage';
import type { CachedRecord, SearchItem } from './storage';
import { catalogIndexUsable, CV_METHOD_CONTROL_ID, cvSamplingFamily, cvTemplateSubstitution, isRinseRecord, normalizeCvTestMethod, pdfAvailability, pdfRouteForRecord } from './recordPolicy';
import { describeWhen, noteRecent, noteSubstitution, readRecent, readSubstitutions, substitutionCsv } from './recent';
import type { RecentEntry } from './recent';
import type { DeskGroupView } from './DeskScene';
import {
  applyPalette, currentHex, GROUP_KEYS, GROUP_LABELS, paletteWarnings, PALETTE_EVENT,
  readOverrides, resetPalette, setGroupColour
} from './palette';
import type { GroupKey } from './palette';
import { BINDER_SHAPES, DEFAULT_SHAPE, readShape, setShape, SHAPE_EVENT } from './binderShape';
import type { BinderShapeId } from './binderShape';
import { QUALITY_OPTIONS, onQualityChange, readQuality, setQuality, applyQuality, type QualityChoice } from './settings';
import { clearOperator, logEvent, operatorLabel, operatorLooksValid, OPERATOR_EVENT, readLog, readOperator, setOperator, storageIsUnavailable, LOG_ACTION_LABELS } from './operator';
import type { LogEntry, Operator } from './operator';
import { mergeParts, renderBatch } from './batchPrint';
import { renderPages, type RenderedPage } from './pdfPreview';
import type { BatchItem, BatchPart, BatchRender } from './batchPrint';
import { documentPayload } from './documentPayload';
import { filterRecordScope } from './recordScope';

const DeskScene = lazy(() => import('./DeskScene'));
const GamesHub = lazy(() => import('./games/GamesHub'));
const BacterialIdentificationGame = lazy(() => import('./games/BacterialIdentificationGame'));
const ExcursionTraceGame = lazy(() => import('./games/ExcursionTraceGame'));
const GameReportPage = lazy(() => import('./games/GameReportPage'));

const GROUP_SHORT: Record<BuildingGroupId, string> = { B10: 'B10', B12: 'B12', B16: 'B16', OTHER: 'OTHER', RESERVE: 'RES' };

function groupStyle(groupId: BuildingGroupId) {
  const key = groupId.toLowerCase();
  return { '--card-color': `var(--${key})`, '--card-wash': `var(--${key}-wash)` } as React.CSSProperties;
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => (typeof matchMedia === 'function' ? matchMedia(query).matches : false));
  useEffect(() => {
    const list = matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/* Which binder the current route is inside, if any. Read once at the shell so
   the spine can run the full height of the column — through the record page
   and its colophon — instead of stopping at the bottom of the page element. */
function useBinderContext() {
  const location = useLocation();
  return useMemo(() => {
    const match = location.pathname.match(/^\/records\/[^/]+\/([^/]+)/);
    if (!match) return undefined;
    const building = new URLSearchParams(location.search).get('building');
    return binderForContext(match[1], building);
  }, [location.pathname, location.search]);
}

function useRecent() {
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  useEffect(() => {
    const sync = () => setEntries(readRecent());
    sync();
    window.addEventListener('anf3:recent', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('anf3:recent', sync); window.removeEventListener('storage', sync); };
  }, []);
  return entries;
}

/* ============================== the rail =============================== */

type ShellContext = { online: boolean; theme: string; toggleTheme: () => void; openPalette: () => void };

const RAIL_PRIMARY = [
  { to: '/', label: 'Shelf' },
  { to: '/records/water', label: 'Water' },
  { to: '/records/air', label: 'Air' },
  { to: '/records/cv', label: 'Cleaning validation' },
  { to: '/calendar', label: 'Calendar' }
];

const RAIL_SECONDARY = [
  { to: '/inventory', label: 'Inventory' },
  { to: '/master-data', label: 'Master data' },
  { to: '/document-code', label: 'Document codes' },
  { to: '/tools', label: 'Tools' },
  { to: '/activity', label: 'บันทึกการใช้งาน' },
  { to: '/games', label: 'Games' },
  { to: '/settings', label: 'ตั้งค่าเครื่องนี้' }
];

function Shell() {
  const online = useOnline();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('anf3.theme') || 'light');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [palette, setPalette] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('anf3.theme', theme); }, [theme]);
  /* data-motion has to exist before the first paint, or the opening frames
     run at full motion on a machine whose operator asked for none. */
  useEffect(() => { applyQuality(); return onQualityChange(() => applyQuality()); }, []);
  /* The reader's own binder colours are written onto :root as the same token
     names everything else already reads, so CSS and the 3D scene stay in step.
     Re-applied when the lamp changes because the derived set differs by mode. */
  useEffect(() => {
    const mode = theme === 'dark' ? 'dark' : 'light';
    const apply = () => applyPalette(mode);
    apply();
    window.addEventListener(PALETTE_EVENT, apply);
    return () => window.removeEventListener(PALETTE_EVENT, apply);
  }, [theme]);
  useEffect(() => { if (!online) setOffline(true); }, [online]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette(true); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  /* QA cannot answer "who printed this" without a name against the action, so
     the workspace asks once per browser before it is used. Nothing verifies the
     number — see operator.ts on why this is attribution, not authentication. */
  const [operator, setOperatorState] = useState(readOperator);
  useEffect(() => {
    const sync = () => setOperatorState(readOperator());
    window.addEventListener(OPERATOR_EVENT, sync);
    return () => window.removeEventListener(OPERATOR_EVENT, sync);
  }, []);
  const operatorKey = operatorLabel(operator);
  useEffect(() => { if (operatorKey) logEvent('workspace_opened'); }, [operatorKey]);

  const toggleTheme = useCallback(() => setTheme((value) => (value === 'light' ? 'dark' : 'light')), []);
  const isCurrent = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));
  const insideBinder = useBinderContext();
  const rail = useRef<HTMLElement>(null);

  /* Collapsed to a strip on a narrow screen, the rail can leave the current
     section off the edge. Bring it back into view when the route changes. */
  useEffect(() => {
    const current = rail.current?.querySelector('[aria-current="page"]');
    current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [location.pathname]);

  if (!operatorLooksValid(operator)) return <OperatorGate current={operator} />;

  return <div className="shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <nav className="rail" aria-label="Sections" ref={rail}>
      <Link className="rail-mark" to="/"><strong>ANF3</strong><span>Laboratory records</span></Link>
      <div className="rail-set">
        {RAIL_PRIMARY.map((item) => <Link key={item.to} className="rail-link" to={item.to} aria-current={isCurrent(item.to) ? 'page' : undefined}>{item.label}</Link>)}
      </div>
      <div className="rail-set">
        {RAIL_SECONDARY.map((item) => <Link key={item.to} className="rail-link" to={item.to} aria-current={isCurrent(item.to) ? 'page' : undefined}>{item.label}</Link>)}
      </div>
      <div className="rail-foot">
        <button className="jump" type="button" onClick={() => setPalette(true)}><Search size={14} />Jump to<kbd>⌘K</kbd></button>
        <p className={`rail-state ${online ? 'is-online' : 'is-offline'}`}>
          {/* A lamp, wired to real state. It is dark when there is nothing to
              say, which is what stops it being decoration. */}
          <span className={`lamp ${online ? 'is-on' : 'is-off'}`} aria-hidden="true" />
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}<span>{online ? 'Online' : 'Offline'}</span>
          <button type="button" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch off the lamp' : 'Switch on the lamp'} title="Lamp">
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </p>
      </div>
    </nav>

    <div
      className={`viewport ${location.pathname === '/' ? 'is-app' : ''} ${insideBinder ? 'in-binder' : ''}`}
      style={insideBinder ? groupStyle(insideBinder.groupId) : undefined}
    >
      {/* Keyed on the SECTION, not the full path. Keying on the full path
          remounts the workspace when the record key changes, which threw away
          the ticked rows the moment somebody opened one of them to check it
          before printing — caught by regress.mjs, not by reading the diff.
          Two segments is the right grain: moving between sections is a change
          of place and earns the motion; picking a record within one is not.

          This is also the most repeated motion in the product, so it runs at
          --dur-micro. A long transition here is a tax on every click. */}
      <main id="main" key={location.pathname.split('/').slice(0, 3).join('/')} className="route-in">
        <Outlet context={{ online, theme, toggleTheme, openPalette: () => setPalette(true) } satisfies ShellContext} />
      </main>
      {location.pathname !== '/' && <Colophon />}
    </div>

    {palette && <Palette onClose={() => setPalette(false)} />}
    {offline && !online && <OfflineDialog onClose={() => setOffline(false)} />}
  </div>;
}

/* One line, because only one fact has to be true on every page: this workspace
 * reads, it never writes. Everything the old colophon listed — which template
 * a domain renders from, what the simulations are and are not — is stated
 * where the user is actually deciding, not filed under the fold. */
/* ===================== the activity log, for QA ======================== */

function ActivityPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const operator = readOperator();

  const load = useCallback(() => {
    setLoading(true);
    readLog(500).then((result) => { setEntries(result.entries); setForwarding(result.forwarding); }).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  return <div className="page wide">
    <header className="masthead">
      <h1>บันทึกการใช้งาน</h1>
      <p>ใครเปิดเวิร์กสเปซ และใครพิมพ์เอกสารใบไหน เวลาบันทึกโดยเซิร์ฟเวอร์บนเครื่องนี้ ไม่ใช่โดยเบราว์เซอร์</p>
    </header>

    <p className="substitution" role="note">
      <Info size={15} aria-hidden="true" />
      <span>
        <strong>นี่คือบันทึกการแจ้งตัว ไม่ใช่การยืนยันตัวตน</strong> ระบบไม่ได้ตรวจสอบรหัสพนักงาน
        จึงบันทึกได้เพียงว่า<em>ใครแจ้งว่าเป็นคนใช้เครื่อง</em> เหมือนสมุดลงชื่อรับเอกสาร
        ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์ตาม 21 CFR Part 11 และไม่ได้จำกัดสิทธิ์เข้าถึง
        ส่วน<em>ใครเป็นคนลงข้อมูล</em> ตอบจากฝั่ง Apps Script ใน Google Sheets ไม่ใช่ที่นี่
      </span>
    </p>

    <div className="activity-bar">
      <p>ผู้ใช้งานเครื่องนี้ตอนนี้: <span className="data">{operatorLabel(operator) || '—'}</span></p>
      <button type="button" onClick={async () => {
        /* Log first: once the identity is cleared there is nobody to name in
           the entry, and an unattributed "somebody left" is worth nothing. */
        await logEvent('operator_changed', { detail: `${operatorLabel(operator)} ออกจากเครื่องนี้` });
        clearOperator();
      }}>ลบชื่อและรหัสจากเครื่องนี้</button>
      <button type="button" onClick={load}><RefreshCw size={14} />รีเฟรช</button>
      <a className="text-link" href="/api/log.csv">ดาวน์โหลด CSV ให้ QA <Download size={13} /></a>
    </div>

    {forwarding && <p className="note"><Info size={14} />ส่งต่อไปยังแท็บ <span className="data">logs</span> ของ System DB ด้วย</p>}

    {loading ? <p className="state is-loading"><RefreshCw size={18} /><span>กำลังอ่าน…</span></p>
      : entries.length ? <div className="activity-table">
        <table>
          <thead><tr><th>เวลา</th><th>การกระทำ</th><th>ชื่อ</th><th>รหัส</th><th>ใบงาน</th><th>รายละเอียด</th><th>เครื่อง</th></tr></thead>
          <tbody>
            {entries.map((entry, index) => <tr key={`${entry.at}-${index}`}>
              <td className="data">{entry.at.replace('T', ' ').slice(0, 19)}</td>
              <td>{LOG_ACTION_LABELS[entry.action] || entry.action}</td>
              <td>{entry.operatorName || entry.operator || '—'}</td>
              <td className="data">{entry.operatorCode || '—'}</td>
              <td className="data">{entry.worksheetNo || '—'}</td>
              <td>{entry.detail || '—'}</td>
              <td className="data">{entry.host}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      : <div className="state"><Info size={20} /><h2>ยังไม่มีบันทึก</h2><p>บันทึกจะเริ่มเก็บเมื่อมีการเปิดเวิร์กสเปซหรือพิมพ์เอกสาร</p></div>}
  </div>;
}


/* ===================== settings for this machine ======================== */

/* Everything here is a property of the PC in front of you, not of the
   laboratory: it is kept in this browser and it travels with nobody. Three
   things that were previously scattered — the operator identity was only
   clearable from the activity log, the shelf look only from the shelf — are
   gathered in one place, because "settings" is where a person looks for
   them. */
function SettingsPage() {
  const { theme } = useOutletContext<ShellContext>();
  const [choice, setChoiceState] = useState<QualityChoice>(readQuality);
  const [operator, setOperatorState] = useState(readOperator);
  const [shelfLook, setShelfLook] = useState(false);
  const [shape, setShapeState] = useState<BinderShapeId>(readShape);
  const [detected, setDetected] = useState('');

  useEffect(() => {
    const syncOperator = () => setOperatorState(readOperator());
    const syncShape = () => setShapeState(readShape());
    window.addEventListener(OPERATOR_EVENT, syncOperator);
    window.addEventListener(SHAPE_EVENT, syncShape);
    return () => {
      window.removeEventListener(OPERATOR_EVENT, syncOperator);
      window.removeEventListener(SHAPE_EVENT, syncShape);
    };
  }, []);

  /* What the shelf actually settled at on this machine, published by
     QualityGovernor. Shown rather than hidden so a support call can ask
     "what does the settings page say" instead of guessing. */
  useEffect(() => {
    const read = () => setDetected(document.documentElement.dataset.shelfQuality || '');
    read();
    const timer = window.setInterval(read, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const choose = (next: QualityChoice) => { setQuality(next); setChoiceState(next); };

  return <div className="page">
    <header className="masthead">
      <h1>ตั้งค่าเครื่องนี้</h1>
      <p>ทุกอย่างในหน้านี้เก็บไว้ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ไม่ส่งไปไหน และไม่มีผลกับเครื่องของคนอื่น</p>
    </header>

    <p className="legend">ภาพและการเคลื่อนไหว</p>
    <fieldset className="quality-set">
      <legend className="sr-only">ระดับคุณภาพของภาพ</legend>
      {QUALITY_OPTIONS.map((option) => <label
        key={option.id}
        className={`quality-option ${choice === option.id ? 'is-chosen' : ''}`}
      >
        <input
          type="radio"
          name="anf3-quality"
          value={option.id}
          checked={choice === option.id}
          onChange={() => choose(option.id)}
        />
        <span>
          <strong>{option.label}</strong>
          <small>{option.detail}</small>
        </span>
      </label>)}
    </fieldset>

    <p className="note">
      <Info size={14} aria-hidden="true" />
      <span>
        {choice === 'auto'
          ? detected
            ? <>ชั้นวางลดคุณภาพลงเองแล้วในระดับ <span className="data">{detected}</span> เพราะวัดได้ว่าเครื่องนี้วาดไม่ทัน</>
            : <>ยังไม่ได้ลดคุณภาพลง — เครื่องนี้วาดทัน</>
          : choice === 'full'
            ? <>ปิดการลดคุณภาพอัตโนมัติแล้ว ถ้าเครื่องนี้ช้าลงในอนาคต ระบบจะไม่ช่วยลดให้เอง</>
            : <>ลดเงาและการเคลื่อนไหวไว้ตั้งแต่แรก และไม่วาดภาพ 3 มิติเต็มรูปแบบ</>}
      </span>
    </p>
    <p className="note">
      <Info size={14} aria-hidden="true" />
      <span>ถ้าตั้งค่า <strong>ลดการเคลื่อนไหว</strong> ไว้ใน Windows ระบบจะเคารพค่านั้นก่อนเสมอ ไม่ว่าจะเลือกอะไรที่นี่</span>
    </p>

    <p className="legend">หน้าตาชั้นวางแฟ้ม</p>
    <div className="settings-row">
      <span>รูปทรงแฟ้มและสีของแต่ละอาคาร<small className="data">{shape}</small></span>
      <button type="button" onClick={() => setShelfLook(true)}>เปิดตัวเลือก</button>
    </div>

    <p className="legend">ผู้ใช้งานเครื่องนี้</p>
    <div className="settings-row">
      <span>{operatorLabel(operator) || 'ยังไม่ได้กรอก'}<small>ชื่อและรหัสที่บันทึกคู่กับทุกครั้งที่เปิดใบงานหรือสั่งพิมพ์</small></span>
      <button type="button" onClick={async () => {
        await logEvent('operator_changed', { detail: `${operatorLabel(operator)} ออกจากเครื่องนี้` });
        clearOperator();
      }}>ลบชื่อและรหัสจากเครื่องนี้</button>
    </div>

    {shelfLook && <ColourDialog theme={theme} shape={shape} onClose={() => setShelfLook(false)} />}
  </div>;
}

/* ===================== who is at this machine ========================== */

/* Asked once per browser, before the workspace opens. Deliberately not called
   a login: it does not check anything and does not restrict access. It gives
   QA a name against every printed document, which is what they asked for. */
function OperatorGate({ current }: { current: Operator }) {
  /* An install from before names were asked for arrives with a code already
     stored; keep it and ask only for what is missing. */
  const [name, setName] = useState(current.name);
  const [code, setCode] = useState(current.code);
  const ready = operatorLooksValid({ name, code });
  return <div className="gate">
    <form className="gate-card" onSubmit={(event) => { event.preventDefault(); if (ready) setOperator({ name, code }); }}>
      <p className="gate-mark"><strong>ANF3</strong><span>Laboratory records</span></p>
      <h1>ชื่อและรหัสพนักงาน</h1>
      <p>
        ใส่ครั้งเดียวพอ เครื่องนี้จะจำไว้ให้จนกว่าคุณจะกดลบเอง ทุกครั้งที่เปิดใบงานหรือพิมพ์เอกสาร
        ระบบจะบันทึกชื่อและรหัสนี้ คู่กับเลขใบงานและเวลา
      </p>
      <label>
        <span className="label">ชื่อ</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="เช่น สมชาย ใจดี"
          autoFocus={!current.code}
          maxLength={60}
        />
      </label>
      <label>
        <span className="label">รหัสพนักงาน</span>
        <input
          className="data"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="เช่น 4417"
          autoFocus={Boolean(current.code) && !current.name ? false : undefined}
          maxLength={40}
        />
      </label>
      <button className="primary" type="submit" disabled={!ready}>เข้าใช้งาน<ArrowRight size={15} /></button>
      {storageIsUnavailable() && <p className="gate-note">
        <Info size={14} aria-hidden="true" />
        <span>เบราว์เซอร์นี้ไม่ยอมให้เก็บข้อมูลไว้ในเครื่อง ใช้งานต่อได้ตามปกติ แต่จะต้องกรอกใหม่ทุกครั้งที่เปิดใหม่</span>
      </p>}
      <p className="gate-note">
        <Info size={14} aria-hidden="true" />
        <span>
          <strong>นี่ไม่ใช่ระบบล็อกอิน</strong> ระบบไม่ได้ตรวจสอบชื่อหรือรหัสนี้ และไม่ได้จำกัดสิทธิ์เข้าถึง
          มันบันทึกว่า <em>ใครแจ้งว่าเป็นคนใช้เครื่องนี้</em> แบบเดียวกับสมุดลงชื่อรับเอกสาร
          ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์ตาม 21 CFR Part 11 · เก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น
          ลบได้ที่หน้า <strong>บันทึกการใช้งาน</strong>
        </span>
      </p>
    </form>
  </div>;
}

function Colophon() {
  return <footer className="colophon">
    <p>Read-only. Records are created and numbered in the owner-managed Google Sheets; PDFs render on the local server from the controlled templates.</p>
    <p className="colophon-mark">ANF3 · GPO</p>
  </footer>;
}

/* ======================= printing a batch of worksheets ================== */

/* A full-screen print preview, because the operator was being asked to send a
   stack of controlled documents to paper without ever seeing it. Each ticked
   worksheet is rendered on the local server, one at a time — the server drives
   Word to make each PDF, and asking for forty at once would only queue them —
   so progress is per worksheet and the run can be stopped.

   What comes back is not merged yet. Every worksheet is shown in its own
   frame, all pages scrollable, with a running page total and a tick to leave
   one out. Only what is still ticked is merged, and only when Print is
   pressed. Unticking is free: the document is already rendered, so changing
   the selection never goes back to the server.

   The frames mount lazily. Twenty PDF viewers at once is enough to stall a
   lab PC, so a worksheet loads its frame when it is scrolled near. */
function BatchPreview({ workflow, items, presetMethod, onClose }: {
  workflow: Workflow;
  items: BatchItem[];
  presetMethod?: string;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState({ done: 0, total: items.length, current: '' });
  const [render, setRender] = useState<BatchRender | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState('');
  const stop = useRef<AbortController | null>(null);

  /* The batch is whatever was ticked when the preview opened, captured once.
     Two bugs live here if it is not.

     The list behind the preview keeps updating — a keystroke in the search
     box, a background refresh — and the parent builds this prop as a fresh
     array literal each render, so a re-render used to re-run the effect. The
     controller was a single one from useRef and was already aborted by the
     previous cleanup, so renderBatch broke out on its first iteration and
     returned nothing: a preview the operator was halfway through reviewing
     became "0 ใบ · 0 หน้า" with no error and no new request to the server.

     Reproduced before fixing: typing in the search field emptied the preview
     while the POST count to /api/pdfs stayed at 3.

     Snapshotting is also the right behaviour on its own. A stack of
     controlled documents under review should not silently change underneath
     the person reviewing it; changing the selection means closing and
     reopening, which is explicit. */
  const [batchItems] = useState(items);

  useEffect(() => {
    /* A fresh controller per run — never a reused one that is already aborted. */
    const controller = new AbortController();
    stop.current = controller;
    let live = true;
    let made: BatchRender | null = null;
    renderBatch(workflow, batchItems, presetMethod, (value) => { if (live) setProgress(value); }, controller.signal)
      .then((value) => { made = value; if (live) setRender(value); })
      .catch((reason) => { if (live) setFailed(reason instanceof Error ? reason.message : 'สร้างชุดเอกสารไม่สำเร็จ'); });
    return () => {
      live = false;
      controller.abort();
      made = null;
    };
  }, [workflow, batchItems, presetMethod]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const parts = render?.parts ?? [];
  const keep = parts.filter((part) => !dropped.has(part.recordKey));
  const pages = keep.reduce((sum, part) => sum + part.pageCount, 0);
  const running = !render && !failed;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const stamp = new Date().toISOString().slice(0, 10);

  const toggle = (recordKey: string) => setDropped((value) => {
    const next = new Set(value);
    if (next.has(recordKey)) next.delete(recordKey); else next.add(recordKey);
    return next;
  });

  /* Merge only what is still ticked, then hand it to the printer or the disk.
     print-js throws inside its own XHR callback when it cannot fetch the blob,
     which no try/catch around this call could ever catch, so onError is passed
     explicitly — without it a failed print is completely silent. */
  const withMerged = async (what: 'print' | 'download') => {
    if (!keep.length) return;
    setBusy(what === 'print' ? 'กำลังรวมไฟล์เพื่อสั่งพิมพ์…' : 'กำลังรวมไฟล์…');
    try {
      const blob = await mergeParts(keep);
      if (!blob) { setFailed('รวมไฟล์ไม่สำเร็จ'); return; }
      const url = URL.createObjectURL(blob);
      if (what === 'download') {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `anf3-${workflow.id}-${stamp}.pdf`;
        anchor.click();
        logEvent('pdf_downloaded', { detail: `${keep.length} ใบ · ${pages} หน้า` });
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      logEvent('pdf_batch', { detail: `${keep.length} ใบ · ${pages} หน้า: ${keep.map((part) => part.worksheetNo).slice(0, 8).join(' ')}` });
      printJS({
        printable: url,
        type: 'pdf',
        showModal: true,
        onError: () => {
          /* Revoke here too: this is the path that fails, so leaving the
             merged document alive is exactly the wrong place to leak it. */
          URL.revokeObjectURL(url);
          setFailed('เบราว์เซอร์เปิดหน้าต่างพิมพ์ไม่สำเร็จ ลองกดดาวน์โหลดแล้วสั่งพิมพ์จากไฟล์แทน');
        },
        onPrintDialogClose: () => setTimeout(() => URL.revokeObjectURL(url), 1000)
      });
    } catch (reason) {
      setFailed(reason instanceof Error ? reason.message : 'รวมไฟล์ไม่สำเร็จ');
    } finally {
      setBusy('');
    }
  };

  return <div className="preview-screen" role="dialog" aria-modal="true" aria-labelledby="preview-title" aria-busy={running}>
    <header className="preview-bar">
      <div className="preview-title">
        <h2 id="preview-title">{running ? 'กำลังเตรียมเอกสาร' : 'ตรวจก่อนพิมพ์'}</h2>
        {!running && !failed && <p>{keep.length} ใบ · <span className="data">{pages}</span> หน้า{dropped.size ? ` · ตัดออก ${dropped.size} ใบ` : ''}</p>}
      </div>
      <div className="preview-actions">
        {!running && keep.length > 0 && <>
          <button type="button" onClick={() => void withMerged('download')} disabled={Boolean(busy)}>
            <Download size={15} />ดาวน์โหลด
          </button>
          <button className="primary" type="button" onClick={() => void withMerged('print')} disabled={Boolean(busy)}>
            <Printer size={15} />พิมพ์ {keep.length} ใบ
          </button>
        </>}
        <button type="button" className="preview-close" onClick={() => { stop.current?.abort(); onClose(); }} aria-label="ปิด"><X size={16} /></button>
      </div>
    </header>

    {busy && <p className="preview-state" role="status">{busy}</p>}

    {running && <div className="preview-state" role="status" aria-live="polite">
      <p>{progress.done} จาก {progress.total}{progress.current ? <> · <span className="data">{progress.current}</span></> : null}</p>
      <div className="batch-track"><i style={{ width: `${percent}%` }} /></div>
      <p className="batch-note">แต่ละใบสร้างจากแม่แบบควบคุมบนเครื่องนี้ เปิดหน้านี้ค้างไว้</p>
      <button type="button" onClick={() => { stop.current?.abort(); onClose(); }}>หยุด</button>
    </div>}

    {failed && <div className="preview-state" role="alert">
      <p>{failed}</p>
      <button type="button" onClick={onClose}>ปิด</button>
    </div>}

    {render && <div className="preview-body">
      {render.skipped.length > 0 && <ul className="batch-skipped">
        {render.skipped.map((row) => <li key={row.worksheetNo}>
          <Info size={14} aria-hidden="true" />
          <span><span className="data">{row.worksheetNo}</span> ไม่ได้ถูกสร้าง — {row.reason}</span>
        </li>)}
      </ul>}

      {parts.length === 0 && render.skipped.length > 0 && <p className="preview-state">ไม่มีใบไหนสร้างได้เลย</p>}

      {parts.map((part, index) => <PreviewSheet
        key={part.recordKey}
        part={part}
        index={index}
        dropped={dropped.has(part.recordKey)}
        onToggle={() => toggle(part.recordKey)}
      />)}
    </div>}
  </div>;
}

/* One worksheet in the preview, drawn page by page with pdf.js rather than
   handed to the browser's PDF plugin — see pdfPreview.ts for why that plugin
   cannot be relied on. Pages are rendered only once the card is scrolled
   near: a forty-worksheet batch rendered up front would stall a lab PC. A
   dropped worksheet keeps its pages on screen, dimmed, so the decision can be
   undone by looking rather than by remembering. */
function PreviewSheet({ part, index, dropped, onToggle }: {
  part: BatchPart;
  index: number;
  dropped: boolean;
  onToggle: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(index < 2);
  const [pages, setPages] = useState<RenderedPage[] | null>(null);
  const [trouble, setTrouble] = useState('');

  useEffect(() => {
    if (near || !holder.current) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '800px' });
    observer.observe(holder.current);
    return () => observer.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near || pages || trouble) return;
    let live = true;
    renderPages(part.bytes)
      .then((value) => { if (live) setPages(value); })
      .catch((reason) => {
        /* Friendly on screen, exact in the console: whoever has to diagnose
           this on a lab PC needs the real reason, the operator does not. */
        console.error('[anf3] preview render failed', reason);
        if (live) setTrouble('แสดงตัวอย่างหน้านี้ไม่ได้ แต่ยังพิมพ์ได้ตามปกติ');
      });
    return () => { live = false; };
  }, [near, pages, trouble, part.bytes]);

  return <article className={`preview-sheet ${dropped ? 'is-dropped' : ''}`} ref={holder}>
    <div className="preview-sheet-bar">
      <label className="check-row">
        <input type="checkbox" checked={!dropped} onChange={onToggle} />
        <span><strong className="data">{part.worksheetNo}</strong><small>{part.pageCount} หน้า</small></span>
      </label>
      {dropped && <span className="preview-dropped-note">จะไม่ถูกพิมพ์</span>}
    </div>
    <div className="preview-pages">
      {trouble && <p className="preview-frame-idle">{trouble}</p>}
      {!trouble && !pages && <p className="preview-frame-idle">{near ? 'กำลังวาดหน้า…' : 'เลื่อนมาถึงเพื่อแสดงตัวอย่าง'}</p>}
      {pages?.map((page) => <figure key={page.pageNumber} className="preview-page">
        <img src={page.url} alt={`${part.worksheetNo} หน้า ${page.pageNumber}`} width={page.width} height={page.height} />
        <figcaption className="data">{page.pageNumber} / {pages.length}</figcaption>
      </figure>)}
    </div>
  </article>;
}

/* ====================== binder colours the reader picks ================== */

/* Free choice, per browser, with the consequences stated rather than
   prevented. The reader picks one hue per building; palette.ts derives the
   five tokens a building needs from it, so no choice can produce an
   unreadable label — but a choice CAN be too pale to see, or too close to
   another building, and both of those are said out loud here. */
function ColourDialog({ theme, shape, onClose }: { theme: string; shape: BinderShapeId; onClose: () => void }) {
  const mode = theme === 'dark' ? 'dark' : 'light';
  const [, force] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const overrides = readOverrides();
  const warnings = paletteWarnings(mode);

  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const pick = (group: GroupKey, value: string) => { setGroupColour(group, value); force((n) => n + 1); };

  return <div className="scrim" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="colour-dialog" role="dialog" aria-modal="true" aria-labelledby="colour-title" ref={dialog}>
      <header>
        <h2 id="colour-title">How the shelf looks</h2>
        <button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </header>
      <p>
        A colour stands for a building, and the shipped set is taken from the
        binders on the real shelf — change it and your screen no longer matches
        the room. Saved in this browser only; nobody else sees it.
      </p>
      <ul className="colour-list">
        {GROUP_KEYS.map((group) => <li key={group}>
          <label>
            <input
              type="color"
              value={currentHex(group)}
              onChange={(event) => pick(group, event.target.value)}
              aria-label={`Colour for ${GROUP_LABELS[group]}`}
            />
            <span>
              <strong>{GROUP_LABELS[group]}</strong>
              <small className="data">{currentHex(group).toUpperCase()}{overrides[group] ? ' · changed' : ''}</small>
            </span>
          </label>
          {overrides[group] && <button type="button" onClick={() => pick(group, '')}>Revert</button>}
        </li>)}
      </ul>
      {warnings.length > 0 && <ul className="colour-warnings">
        {warnings.map((warning) => <li key={`${warning.group}-${warning.kind}`}>
          <Info size={14} aria-hidden="true" />{warning.text}
        </li>)}
      </ul>}
      <section className="shape-picker">
        <h3>Shape of the files</h3>
        <p>
          The default is the lever arch file actually on the ANF3 shelf. The others are
          real filing formats — the shape changes, the building colour and the record
          behind it do not.
        </p>
        <div className="shape-grid">
          {BINDER_SHAPES.map((option) => <button
            key={option.id}
            type="button"
            className={shape === option.id ? 'is-active' : ''}
            aria-pressed={shape === option.id}
            onClick={() => setShape(option.id)}
          >
            <span className="shape-swatch" style={{ '--shape-w': `${Math.round(option.width * 34)}px` } as React.CSSProperties} />
            <span className="shape-name">{option.label}{option.id === DEFAULT_SHAPE ? ' · on the shelf' : ''}</span>
            <span className="shape-detail">{option.detail}</span>
          </button>)}
        </div>
      </section>

      <footer>
        <button type="button" onClick={() => { resetPalette(); force((n) => n + 1); }}>
          <Undo2 size={15} />Back to the photographed colours
        </button>
        <button className="primary" type="button" onClick={onClose}><Check size={15} />Done</button>
      </footer>
    </div>
  </div>;
}

/* ========================== command palette ============================ */

type Jump = { key: string; title: string; detail: string; kind: string; route: string };

function buildJumps(): Jump[] {
  const list: Jump[] = [];
  binderInstances.filter((binder) => binder.state === 'active' && binder.route).forEach((binder) => {
    const group = buildingGroups.find((entry) => entry.id === binder.groupId);
    list.push({ key: binder.id, title: binder.label, detail: `${group?.label} · ${workflowById(binder.workflowId)?.name}`, kind: 'Binder', route: binder.route as string });
  });
  workflows.forEach((workflow) => {
    list.push({ key: `wf-${workflow.id}`, title: workflow.name, detail: workflow.description, kind: 'Workflow', route: `/records/${workflow.domain}/${workflow.id}` });
  });
  [...RAIL_PRIMARY, ...RAIL_SECONDARY].forEach((item) => {
    list.push({ key: `page-${item.to}`, title: item.label, detail: 'Section', kind: 'Page', route: item.to });
  });
  return list;
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const all = useMemo(buildJumps, []);

  const hits = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const source = needle
      ? all.filter((item) => `${item.title} ${item.detail} ${item.kind}`.toLocaleLowerCase().includes(needle))
      : all;
    return source.slice(0, 24);
  }, [all, query]);

  useEffect(() => { field.current?.focus(); }, []);
  useEffect(() => { setCursor(0); }, [query]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); setCursor((value) => Math.min(hits.length - 1, value + 1)); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setCursor((value) => Math.max(0, value - 1)); }
      if (event.key === 'Enter' && hits[cursor]) { event.preventDefault(); navigate(hits[cursor].route); onClose(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [hits, cursor, navigate, onClose]);

  return <div className="palette-scrim" role="presentation" onClick={onClose}>
    <div className="palette" role="dialog" aria-modal="true" aria-label="Jump to" onClick={(event) => event.stopPropagation()}>
      <div className="palette-input">
        <Search size={16} />
        <input ref={field} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Binder, workflow or section" aria-label="Jump to" />
      </div>
      <div className="palette-results">
        <ul>
          {hits.map((item, index) => <li key={item.key}>
            <button
              className="palette-row"
              type="button"
              data-active={index === cursor}
              onMouseEnter={() => setCursor(index)}
              onClick={() => { navigate(item.route); onClose(); }}
            >
              <span><strong>{item.title}</strong><small>{item.detail}</small></span>
              <em>{item.kind}</em>
            </button>
          </li>)}
          {!hits.length && <li><p className="palette-row"><span><strong>Nothing matches</strong><small>Try a binder name, a building, or a section</small></span></p></li>}
        </ul>
      </div>
      <p className="palette-foot">↑↓ to move · Enter to open · Esc to close</p>
    </div>
  </div>;
}

function OfflineDialog({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !box.current) return;
      const controls = Array.from(box.current.querySelectorAll<HTMLElement>('button, a[href], input')).filter((element) => !element.hasAttribute('disabled'));
      if (!controls.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);
  return <div className="scrim" role="presentation">
    <section ref={box} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="offline-title">
      <WifiOff size={22} />
      <div>
        <h2 id="offline-title">No internet connection</h2>
        <p>Cached records stay readable. Preview, Print, Download and Save to Desktop are held until the selected record can be fetched again.</p>
      </div>
      <div className="row">
        <button type="button" onClick={() => location.reload()}><RefreshCw size={14} />Retry</button>
        <button ref={close} type="button" className="quiet" onClick={onClose}>Read cached</button>
      </div>
    </section>
  </div>;
}

/* =============================== the desk ============================== */

function DeskPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returning = (location.state as { returning?: string } | null)?.returning ?? null;
  const { theme } = useOutletContext<ShellContext>();
  const recent = useRecent();
  const [activeGroup, setActiveGroup] = useState<BuildingGroupId>('B16');
  const [hovered, setHovered] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const openTimer = useRef(0);
  const [webgl, setWebgl] = useState(false);
  const [colours, setColours] = useState(false);
  const [paletteRevision, setPaletteRevision] = useState(0);
  /* The filing format the reader wants to look at. Per browser, cosmetic:
     a binder means the same record whichever shape is drawn. */
  const [shape, setShapeState] = useState<BinderShapeId>(readShape);
  useEffect(() => {
    const sync = () => setShapeState(readShape());
    window.addEventListener(SHAPE_EVENT, sync);
    return () => window.removeEventListener(SHAPE_EVENT, sync);
  }, []);
  useEffect(() => {
    const bump = () => setPaletteRevision((n) => n + 1);
    window.addEventListener(PALETTE_EVENT, bump);
    return () => window.removeEventListener(PALETTE_EVENT, bump);
  }, []);
  /* Set when the GPU drops the WebGL context and does not restore it; the flat
   * shelf takes over rather than leaving an empty rectangle. */
  const [lostContext, setLostContext] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches); update(); query.addEventListener('change', update);
    const probe = document.createElement('canvas');
    setWebgl(window.innerWidth >= 760 && Boolean(probe.getContext('webgl2') || probe.getContext('webgl')));
    return () => query.removeEventListener('change', update);
  }, []);

  const ordered = useMemo(() => buildingGroups.slice().sort((a, b) => a.order - b.order), []);

  const groups: DeskGroupView[] = useMemo(() => ordered.map((group) => ({
    id: group.id,
    short: GROUP_SHORT[group.id],
    label: group.label,
    locked: !group.active,
    binders: shelfBinders(group.id).map((binder) => ({ id: binder.id, groupId: binder.groupId, spine: binder.spine }))
  })), [ordered]);

  const openBinder = useCallback((binderId: string) => {
    const binder = binderById(binderId);
    if (!binder?.route || binder.state !== 'active') return;
    const group = buildingGroups.find((entry) => entry.id === binder.groupId);
    noteRecent({ key: binder.id, title: binder.label, detail: group?.label || '', route: binder.route });
    navigate(binder.route);
  }, [navigate]);

  /* Opening from the shelf plays the binder out of the row before the route
     changes, so the click and the page turn are one movement. Opening from
     the index list is the fast path and goes straight there. */
  const requestOpen = useCallback((binderId: string) => {
    const binder = binderById(binderId);
    if (!binder?.route || binder.state !== 'active') return;
    setOpening(binderId);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => { setOpening(null); openBinder(binderId); }, 640);
  }, [openBinder]);

  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  const step = (direction: number) => {
    const index = ordered.findIndex((group) => group.id === activeGroup);
    const next = ordered[(index + direction + ordered.length) % ordered.length];
    setActiveGroup(next.id);
    setHovered(null);
  };

  /* ← → walk the binders on the shelf and Enter opens the one you land on, so
     the scene is reachable without a pointer. The DOM index below stays the
     canonical control; this only mirrors it. */
  const walkShelf = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
    if (target?.closest('[role="tablist"]')) return;
    const list = activeBinders(activeGroup);
    if (!list.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const at = list.findIndex((binder) => binder.id === hovered);
      const next = event.key === 'ArrowRight'
        ? (at + 1) % list.length
        : (at <= 0 ? list.length - 1 : at - 1);
      setHovered(list[next].id);
    }
    if (event.key === 'Enter' && hovered) { event.preventDefault(); requestOpen(hovered); }
  }, [activeGroup, hovered, requestOpen]);

  useEffect(() => {
    window.addEventListener('keydown', walkShelf);
    return () => window.removeEventListener('keydown', walkShelf);
  }, [walkShelf]);

  const group = ordered.find((entry) => entry.id === activeGroup);
  const onShelf = activeBinders(activeGroup);
  const total = binderInstances.filter((binder) => binder.state === 'active').length;
  const live = webgl && !lostContext && !reduced;

  return <div className="workbench">
    <header className="workbench-bar">
      <h1>Records shelf</h1>
      <div
        className="shelf-tabs"
        role="tablist"
        aria-label="Building"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
          if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
        }}
      >
        {ordered.map((entry) => <button
          key={entry.id}
          type="button"
          role="tab"
          aria-selected={activeGroup === entry.id}
          tabIndex={activeGroup === entry.id ? 0 : -1}
          className="shelf-tab"
          style={groupStyle(entry.id)}
          onClick={() => setActiveGroup(entry.id)}
        >
          <span className="tab-swatch" />
          {entry.label}
          <span className="tab-count">{entry.active ? activeBinders(entry.id).length : '—'}</span>
        </button>)}
      </div>
      <button className="bar-colours" type="button" onClick={() => setColours(true)}>Shelf look</button>
      <p className="bar-count"><strong>{total}</strong> binders</p>
    </header>

    <div className="workbench-body">
      <section className={`shelf-view ${opening ? 'is-opening' : ''}`} aria-hidden="true">
        {live
          ? <Suspense fallback={<FlatDesk groups={groups} active={activeGroup} />}>
            <DeskScene
              groups={groups}
              activeGroup={activeGroup}
              hoveredBinder={hovered}
              openingBinder={opening}
              returningBinder={returning}
              theme={theme}
              onPickGroup={(id) => setActiveGroup(id as BuildingGroupId)}
              onHoverBinder={setHovered}
              onOpenBinder={requestOpen}
              paletteRevision={paletteRevision}
              shape={shape}
              onContextLost={() => setLostContext(true)}
            />
          </Suspense>
          : <FlatDesk groups={groups} active={activeGroup} />}
      </section>

      <aside className="shelf-index" style={groupStyle(activeGroup)}>
        <div className="index-head">
          <h2>{group?.label}</h2>
          <span className="data">{group?.active ? `${onShelf.length} binders` : 'reserve'}</span>
        </div>

        {group?.active
          ? <ul className="binder-run">
            {onShelf.map((binder) => <li key={binder.id}>
              <BinderRow binder={binder} marked={hovered === binder.id} onHover={setHovered} onOpen={openBinder} />
            </li>)}
          </ul>
          : <p className="index-empty">
            One spare binder stands on the shelf, printed <span className="data">COMING SOON</span>.
            No route, no API, no record count.
          </p>}

        <div className="index-head index-head-2">
          <h2>In-tray</h2>
          <span className="data">{recent.length ? `${recent.length} recent` : 'empty'}</span>
        </div>
        {recent.length
          ? <ul className="ledger">{recent.slice(0, 6).map((entry) => <li key={entry.key}>
            <Link to={entry.route}>
              <span><strong>{entry.title}</strong><small>{entry.detail}</small></span>
              <time dateTime={new Date(entry.at).toISOString()}>{describeWhen(entry.at)}</time>
            </Link>
          </li>)}</ul>
          : <p className="index-empty">What you open is remembered on this browser only.</p>}
      </aside>
    </div>

    <footer className="workbench-status">
      <span>{live ? 'Click a shelf label to change building, or a binder to open it. ← → moves along the shelf.' : 'Flat shelf — WebGL unavailable, or reduced motion is on.'}</span>
      <Link className="text-link" to="/calendar">Calendar <ArrowRight size={13} /></Link>
      <Link className="text-link" to="/tools">Tools <ArrowRight size={13} /></Link>
    </footer>

    {colours && <ColourDialog theme={theme} shape={shape} onClose={() => setColours(false)} />}
  </div>;
}

function BinderRow({ binder, marked, onHover, onOpen }: {
  binder: BinderInstance;
  marked: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const workflow = workflowById(binder.workflowId);
  if (!workflow || !binder.route) return null;
  return <Link
    className={`binder-row ${marked ? 'is-marked' : ''}`}
    to={binder.route}
    onMouseEnter={() => onHover(binder.id)}
    onMouseLeave={() => onHover(null)}
    onFocus={() => onHover(binder.id)}
    onBlur={() => onHover(null)}
    onClick={(event) => { event.preventDefault(); onOpen(binder.id); }}
  >
    <span><strong>{binder.label}</strong><small>{workflow.name}</small></span>
    <ChevronRight size={15} />
  </Link>;
}

function FlatDesk({ groups, active }: { groups: DeskGroupView[]; active: string }) {
  return <div className="desk-flat">
    {groups.map((group) => <div key={group.id} className="desk-flat-row" style={{ '--card-color': `var(--${group.id.toLowerCase()}-spine)` } as React.CSSProperties}>
      <i />
      <span>{group.label}{group.id === active ? ' · on the shelf' : ''}</span>
      <em>{group.locked ? 'reserved' : `${group.binders.length} binders`}</em>
    </div>)}
  </div>;
}

/* A tool that lives on the laboratory network is probed before it is opened.
   The probe is a no-cors GET with a short timeout: it cannot read the
   response, but a network-level failure is exactly what we need to detect.
   A browser cannot join a Wi-Fi network, so the dialog says what to do
   rather than pretending it can do it. */
function ToolLink({ tool }: { tool: Tool }) {
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState(false);

  if (!tool.network) {
    return <a className="tool-card" href={tool.href} target="_blank" rel="noreferrer">
      <span className="tool-name">{tool.label}</span>
      <span className="tool-detail">{tool.detail}</span>
      <span className="tool-go">Open <ExternalLink size={13} /></span>
    </a>;
  }

  const open = async () => {
    setChecking(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    try {
      await fetch(tool.href, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
      window.open(tool.href, '_blank', 'noreferrer');
    } catch {
      setBlocked(true);
    } finally {
      window.clearTimeout(timer);
      setChecking(false);
    }
  };

  return <>
    <button className="tool-card" type="button" onClick={open} disabled={checking}>
      <span className="tool-name">{tool.label}<i className="tool-net">{tool.network}</i></span>
      <span className="tool-detail">{checking ? 'Checking the network…' : tool.detail}</span>
      <span className="tool-go">{checking ? 'Checking…' : <>Open <ExternalLink size={13} /></>}</span>
    </button>
    {blocked && <NetworkDialog tool={tool} onClose={() => setBlocked(false)} onRetry={() => { setBlocked(false); open(); }} />}
  </>;
}

function NetworkDialog({ tool, onClose, onRetry }: { tool: Tool; onClose: () => void; onRetry: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return <div className="scrim" role="presentation">
    <section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="coa-title">
      <WifiOff size={22} />
      <div>
        <h2 id="coa-title">{tool.label} is not reachable</h2>
        <p>
          {tool.label} runs on the laboratory network at <span className="data">{tool.href}</span>. This computer cannot
          reach it right now — either you are outside the network, or the machine hosting it is off.
        </p>
        <p>
          Connect to the Wi-Fi network <strong>{tool.network}</strong>, then try again. A browser cannot switch Wi-Fi
          for you; use the network menu on this computer.
        </p>
      </div>
      <div className="row">
        <button type="button" onClick={onRetry}><RefreshCw size={14} />Try again</button>
        <button ref={close} type="button" className="quiet" onClick={onClose}>Close</button>
      </div>
    </section>
  </div>;
}

/* A Google embed that cannot load leaves a plain grey rectangle with nothing
   in it, which reads as a broken page rather than as "this needs the internet".
   If nothing has loaded after a few seconds, or the browser is offline, say
   what is wrong and what to do instead. */
function CalendarEmbed({ mode }: { mode: 'AGENDA' | 'MONTH' }) {
  const online = useOnline();
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const source = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Asia%2FBangkok&mode=${mode}&showTitle=0&showPrint=0&showTabs=0&showCalendars=0`;

  useEffect(() => {
    setLoaded(false); setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 6000);
    return () => window.clearTimeout(timer);
  }, [mode]);

  if (!online || (slow && !loaded)) {
    return <div className="calendar-out">
      <CalendarDays size={24} aria-hidden="true" />
      <h2>{online ? 'The calendar did not load' : 'You are offline'}</h2>
      <p>
        {online
          ? 'Google Calendar could not be reached, or this calendar is not shared with the account signed in to this browser. Records and PDFs are unaffected — they do not depend on it.'
          : 'The calendar is read live from Google and is not cached. Everything else in this workspace still works offline from the local cache.'}
      </p>
      <a
        className="text-link"
        href={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Asia%2FBangkok`}
        target="_blank"
        rel="noreferrer"
      >Open in Google Calendar <ExternalLink size={13} /></a>
    </div>;
  }

  return <iframe
    className="calendar-frame"
    title={`ANF3 calendar, ${mode.toLowerCase()} view`}
    src={source}
    onLoad={() => setLoaded(true)}
  />;
}

/* ============================ record pages ============================= */

function DomainPage() {
  const { domain = '' } = useParams();
  const [searchParams] = useSearchParams();
  const valid = domains.find((item) => item.id === domain);
  if (!valid) return <Navigate to="/" replace />;
  if (domain === 'cv') {
    const query = searchParams.toString();
    return <Navigate to={`/records/cv/cv${query ? `?${query}` : ''}`} replace />;
  }
  const list = workflows.filter((workflow) => workflow.domain === domain);
  return <div className="page">
    <header className="masthead">
      <h1>{valid.label}</h1>
      <p>Read from the System DB. Editing, numbering and synchronisation stay in the owner-managed Google Sheets.</p>
    </header>
    <div className="run">{list.map((workflow) => <Link key={workflow.id} to={`/records/${workflow.domain}/${workflow.id}`}>
      <span><strong>{workflow.name}</strong><small>{workflow.description}</small></span>
      <ChevronRight size={16} />
    </Link>)}</div>
  </div>;
}

/* The orange binder. Building 11 and Building 19 share one physical file, so
   opening it shows what is inside instead of guessing which one you meant. */
function BinderPage() {
  const { binderId = '' } = useParams();
  const binder = binderById(binderId);
  if (!binder || !binder.sections) return <Navigate to="/" replace />;
  const group = buildingGroups.find((entry) => entry.id === binder.groupId);
  return <div className="page">
    <header className="masthead">
      <h1>{binder.label}</h1>
      <p>{group?.label} — one binder, {binder.sections.length} sets of records. Choose which one you are reading.</p>
    </header>
    <div className="run">{binder.sections.map((section) => <Link key={section.id} to={section.route}>
      <span><strong>{section.label}</strong><small>{section.detail}</small></span>
      <ChevronRight size={16} />
    </Link>)}</div>
  </div>;
}

/* The Cleaning Validation binder. One binder per building; what kind of
   record it is decides which approved template the PDF is rendered from, so
   that choice is made here, before the record list, not at the last moment.

     Contact Plate ............ CV Contact Plate template
     Rinse · Pour Plate ....... PW / PRW template family
     Rinse · Membrane Filtration  WFI / PUS template family */
function CvBinderPage({ building }: { building?: string }) {
  const [searchParams] = useSearchParams();
  const family = searchParams.get('samplingFamily');
  const base = building ? `building=${encodeURIComponent(building)}&` : '';

  if (family === 'rinse') {
    return <div className="page">
      <header className="masthead">
        <h1>Rinse — test method</h1>
        <p>{building ? `${building}. ` : ''}The method decides the approved template the record is printed on. Choose it now; you can still change it on an individual record.</p>
      </header>
      <div className="run">
        <Link to={`/records/cv/cv?${base}samplingFamily=rinse&testMethod=pour-plate`}>
          <span><strong>Pour Plate</strong><small>Printed on the approved PW / PRW template family</small></span>
          <ChevronRight size={16} />
        </Link>
        <Link to={`/records/cv/cv?${base}samplingFamily=rinse&testMethod=membrane-filtration`}>
          <span><strong>Membrane Filtration</strong><small>Printed on the approved WFI / PUS template family</small></span>
          <ChevronRight size={16} />
        </Link>
      </div>
      <p className="note"><Info size={14} />Rinse records are Cleaning Validation records. They never enter the Water worksheet sequence.</p>
    </div>;
  }

  return <div className="page">
    <header className="masthead">
      <h1>Cleaning Validation</h1>
      <p>{building ? `${building}. ` : ''}One binder for the building. Choose what kind of record you are reading.</p>
    </header>
    <div className="run">
      <Link to={`/records/cv/cv?${base}samplingFamily=contact-plate`}>
        <span><strong>Contact Plate</strong><small>Printed on the approved CV Contact Plate template</small></span>
        <ChevronRight size={16} />
      </Link>
      <Link to={`/records/cv/cv?${base}samplingFamily=rinse`}>
        <span><strong>Rinse</strong><small>Pour Plate or Membrane Filtration — chosen next</small></span>
        <ChevronRight size={16} />
      </Link>
    </div>
  </div>;
}

function RecordsPage() {
  const { domain = '', workflow: workflowId = '', recordKey } = useParams();
  const [searchParams] = useSearchParams();
  const workflow = workflowById(workflowId);
  if (!workflow || workflow.domain !== domain) return <Navigate to="/" replace />;

  const building = searchParams.get('building') || undefined;
  const samplingFamily = searchParams.get('samplingFamily') || undefined;
  const testMethod = searchParams.get('testMethod') || undefined;

  /* CV opens onto its own contents page until the family — and, for rinse,
     the method — has been chosen. A direct link to a record skips the step. */
  if (workflow.id === 'cv' && !recordKey) {
    if (!samplingFamily) return <CvBinderPage building={building} />;
    if (samplingFamily === 'rinse' && !testMethod) return <CvBinderPage building={building} />;
  }

  const filters: RecordFilters = {
    building,
    gasType: searchParams.get('gasType') || undefined,
    waterType: searchParams.get('waterType') || undefined,
    samplingFamily,
    testMethod,
    samplingMode: searchParams.get('samplingMode') || undefined
  };
  return <Workspace workflow={workflow} initialRecordKey={recordKey} initialFilters={filters} presetMethod={testMethod} />;
}

function Workspace({ workflow, initialRecordKey, initialFilters = {}, presetMethod }: { workflow: Workflow; initialRecordKey?: string; initialFilters?: RecordFilters; presetMethod?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnline();
  const [items, setItems] = useState<SearchItem[]>([]);
  const [query, setQuery] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [detail, setDetail] = useState<CachedRecord | null>(null); const [fresh, setFresh] = useState(false);

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    const timer = window.setTimeout(async () => {
      try {
        if (!online) throw new Error('Offline');
        const result = await searchSystem(workflow, { ...initialFilters, q: query, from, to, limit: 60 }, controller.signal);
        setItems(result.items); await putCachedSearch(workflow.id, result.items, initialFilters);
      } catch (reason) {
        if (controller.signal.aborted) return;
        const cached = await getCachedSearch(workflow.id, initialFilters); setItems(cached);
        setError(cached.length ? 'Showing cached search results' : reason instanceof Error ? reason.message : 'System DB unavailable');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 280);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [workflow, query, from, to, online, initialFilters.building, initialFilters.gasType, initialFilters.waterType, initialFilters.samplingFamily, initialFilters.testMethod, initialFilters.samplingMode]);

  useEffect(() => {
    if (!initialRecordKey) { setDetail(null); setFresh(false); return; }
    const controller = new AbortController(); setFresh(false);
    (async () => {
      const cached = await getCachedRecord(workflow.domain, workflow.id, initialRecordKey); if (cached) setDetail(cached);
      if (!online) return;
      try {
        const current = await getSystemRecord(workflow, initialRecordKey, controller.signal);
        const value = { domain: workflow.domain, workflow: workflow.id, recordKey: initialRecordKey, ...current };
        setDetail({ ...value, id: `${workflow.domain}:${workflow.id}:${initialRecordKey}` }); await putCachedRecord(value); setFresh(true);
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Record unavailable'); }
    })();
    return () => controller.abort();
  }, [workflow, initialRecordKey, online]);

  const select = (item: SearchItem) => navigate(`/records/${workflow.domain}/${workflow.id}/${encodeURIComponent(item.recordKey || item.recordId || item.worksheetNo || '')}${location.search}`);
  /* The crumb already says which binder this is, so the lede only carries the
     part of the filter the crumb cannot: the sampling family and the method. */
  const SCOPE_WORDS: Record<string, string> = {
    'contact-plate': 'Contact Plate', rinse: 'Rinse', 'pour-plate': 'Pour Plate',
    'membrane-filtration': 'Membrane Filtration', passive: 'passive', active: 'active'
  };
  const say = (value: string) => value.split(',').map((part) => SCOPE_WORDS[part.trim()] || part.trim()).join(' and ');
  /* Worksheets ticked for a batch print. Cleared when the result set changes,
     because a key that is no longer listed cannot be reviewed before printing. */
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState(false);
  useEffect(() => { setPicked(new Set()); }, [workflow.id, query, from, to, initialFilters.building, initialFilters.samplingFamily, initialFilters.testMethod]);
  const toggle = (key: string) => setPicked((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const scopedItems = filterRecordScope(items, initialFilters);
  const allPicked = scopedItems.length > 0 && picked.size === scopedItems.length;

  const binder = binderForContext(workflow.id, initialFilters.building);
  const scope = [
    initialFilters.samplingFamily && say(initialFilters.samplingFamily),
    presetMethod && say(presetMethod),
    initialFilters.gasType && say(initialFilters.gasType),
    initialFilters.waterType && say(initialFilters.waterType),
    !binder && initialFilters.building
  ].filter(Boolean).join(' · ');
  const group = buildingGroups.find((entry) => entry.id === binder?.groupId);

  /* The page is the inside of the binder the reader just opened: it carries
     that binder's spine down the left edge and its label at the top, and it
     settles onto the paper the closing frame of the 3D animation left behind.
     Closing puts the binder back on the shelf. */
  return <div className={`page wide ${binder ? 'binder-open' : ''}`}>
    <header className="binder-head">
      <div>
        <p className="binder-crumb">
          {binder ? <button type="button" className="close-binder" onClick={() => navigate('/', { state: { returning: binder.id } })}>
            <Undo2 size={13} />Close the binder
          </button> : <Link className="close-binder" to="/"><Undo2 size={13} />Back to the shelf</Link>}
          {group && <span className="binder-where">{[group.label, binder?.label].filter((part, index, all) => part && all.indexOf(part) === index).join(' · ')}</span>}
        </p>
        <h1>{workflow.name}</h1>
        <p>{scope ? `${scope}. ` : ''}Search, read, preview and print. This workspace never edits a record.</p>
      </div>
    </header>
    <div className="work">
      <aside className="browser">
        <div className="filters">
          <label><Search size={15} /><input aria-label="Search records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Worksheet, building, product" /></label>
          <div className="dates">
            <input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
        {error && <p className="note"><Info size={14} />{error}</p>}
        {scopedItems.length > 0 && <div className="batch-bar">
          <label>
            <input
              type="checkbox"
              checked={allPicked}
              ref={(node) => { if (node) node.indeterminate = picked.size > 0 && !allPicked; }}
              onChange={() => setPicked(allPicked ? new Set() : new Set(scopedItems.map((item) => item.recordKey)))}
              aria-label="Select every worksheet in this list"
            />
            <span>{picked.size ? `${picked.size} selected` : 'Select for printing'}</span>
          </label>
          {picked.size > 0 && <>
            <button type="button" className="primary" onClick={() => setBatch(true)}>
              <Printer size={14} />Print {picked.size}
            </button>
            <button type="button" onClick={() => setPicked(new Set())}>Clear</button>
          </>}
        </div>}
        <div className="hits">{loading
          ? <p className="state is-loading"><RefreshCw size={18} /><span>Loading records…</span></p>
          : scopedItems.length
            ? scopedItems.map((item) => <div className="hit" key={item.recordKey}>
              <input
                type="checkbox"
                checked={picked.has(item.recordKey)}
                onChange={() => toggle(item.recordKey)}
                aria-label={`Select ${item.worksheetNo || item.recordKey} for printing`}
              />
              <button
                type="button"
                className={picked.has(item.recordKey) ? 'is-picked' : ''}
                aria-current={initialRecordKey === item.recordKey}
                onClick={() => select(item)}
              >
                <span><strong>{item.worksheetNo || item.recordId || item.recordKey}</strong><small>{item.building || item.productName || 'No location'} · {item.samplingDate || 'No date'}</small></span>
                <ChevronRight size={14} />
              </button>
            </div>)
            : <div className="state">
              <Search size={20} />
              <h2>No records</h2>
              <p>{endpointConfigured(workflow.domain) ? 'Change the filters or the date range.' : 'The public read endpoint for this domain is not configured yet.'}</p>
            </div>}
        </div>
      </aside>
      {batch && <BatchPreview
        workflow={workflow}
        items={scopedItems.filter((item) => picked.has(item.recordKey))
          .map((item) => ({ recordKey: item.recordKey, worksheetNo: item.worksheetNo || item.recordId || item.recordKey }))}
        presetMethod={presetMethod}
        onClose={() => setBatch(false)}
      />}
      <section className="sheet">{detail
        ? <RecordSheet workflow={workflow} value={detail} fresh={fresh} online={online} presetMethod={presetMethod} />
        : <div className="state"><BookOpen size={20} /><h2>Pick a worksheet</h2><p>Choose one from the list to read what the System DB currently holds.</p></div>}
      </section>
    </div>
  </div>;
}

function RecordSheet({ workflow, value, fresh, online, presetMethod }: { workflow: Workflow; value: CachedRecord; fresh: boolean; online: boolean; presetMethod?: string }) {
  const fields = Object.entries(value.record).filter(([, field]) => field !== '' && field !== null && field !== undefined).slice(0, 36);
  const availability = pdfAvailability(workflow, value.record, fresh, online, presetMethod);
  const family = workflow.id === 'cv' ? cvSamplingFamily(value.record) : null;
  const current = fresh && online;
  const worksheet = String(value.record.worksheetNo || value.record.docNo || value.recordKey);

  useEffect(() => {
    if (!current) return;
    noteRecent({ key: `${workflow.id}:${value.recordKey}`, title: worksheet, detail: workflow.shortName, route: `/records/${workflow.domain}/${workflow.id}/${encodeURIComponent(value.recordKey)}` });
  }, [current, worksheet, workflow, value.recordKey]);

  /* QA's second question is who *read* a controlled record, not only who
     printed one. `record_opened` was declared on both sides and given a Thai
     label from the start, but nothing ever emitted it — this is that call.
     Keyed on the worksheet so re-renders do not log the same open twice. */
  useEffect(() => {
    logEvent('record_opened', { worksheetNo: worksheet, detail: workflow.shortName });
  }, [worksheet, workflow.shortName]);

  return <div>
    <div className="sheet-head">
      <div>
        <h2>{worksheet}</h2>
        <p>{current ? 'Current System DB' : 'Cached copy'} · fetched {new Date(value.fetchedAt).toLocaleString('en-GB')}{family && family !== 'unknown' ? ` · ${family}` : ''}</p>
      </div>
      <span className={`stamp ${current ? 'is-fresh' : 'is-cached'}`} key={current ? 'fresh' : 'cached'}>
        {current ? <Check size={12} /> : <WifiOff size={12} />}{current ? 'Fresh' : 'Cached'}
      </span>
    </div>
    {/* The two figures a reader checks before doing anything else, given the
        panel treatment so they are read rather than hunted for: how many
        samples are on this worksheet, and how many fields came back. The
        readout carries its unit small so the eye lands on the number. */}
    <div className="well well-row panel-in calibrated">
      <span>
        <span className="label">Samples</span>
        <span className="readout">{value.samples.length}<small>rows</small></span>
      </span>
      <span>
        <span className="label">Fields returned</span>
        <span className="readout">{fields.length}<small>of {Object.keys(value.record).length}</small></span>
      </span>
      <span>
        <span className="label">Source</span>
        <span className="readout">{current ? 'LIVE' : 'CACHE'}</span>
      </span>
    </div>
    <Actions workflow={workflow} value={value} availability={availability} presetMethod={presetMethod} />
    <p className="legend">Record fields</p>
    <div className="fields">{fields.map(([key, field]) => <div key={key}>
      <span className="key">{key}</span><span className="value">{display(field)}</span>
    </div>)}</div>
    <section className="samples">
      <h3 className="legend">Samples <span>{value.samples.length}</span></h3>
      {value.samples.slice(0, 100).map((sample, index) => <div className="sample" key={index}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{String(sample.samplingPoint || sample.room || sample.location || 'Sample')}</strong>
        <small>{String(sample.resultDisplay || sample.resultValue || sample.occResult || '')}</small>
      </div>)}
    </section>
  </div>;
}

function Actions({ workflow, value, availability, presetMethod }: { workflow: Workflow; value: CachedRecord; availability: ReturnType<typeof pdfAvailability>; presetMethod?: string }) {
  const [pdfId, setPdfId] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [viewer, setViewer] = useState(false);
  const wide = useMedia('(min-width: 68rem)');
  /* The method chosen when the binder was opened wins; the record's own field
     is the fallback, and the radio group below can still override both. */
  const preset = normalizeCvTestMethod(presetMethod);
  const inferred = preset !== 'unknown' ? preset : normalizeCvTestMethod(value.record.testMethod || value.record.samplingMethod);
  const [method, setMethod] = useState(inferred === 'unknown' ? '' : inferred);
  const url = pdfId ? `/api/pdfs/${pdfId}/download?inline=1` : '';
  /* The form this record will print on may not carry its own acceptance
     criterion — see cvTemplateSubstitution. The owner accepted the
     substitution; it must still be visible before anyone prints. */
  const substitution = cvTemplateSubstitution(workflow, value.record, method || presetMethod);
  const rinse = workflow.id === 'cv' && isRinseRecord(value.record);
  const route = pdfRouteForRecord(workflow, value.record, method);
  const canGenerate = availability.enabled || (availability.reason === 'method-required' && Boolean(route));

  useEffect(() => {
    const fromBinder = normalizeCvTestMethod(presetMethod);
    const next = fromBinder !== 'unknown' ? fromBinder : normalizeCvTestMethod(value.record.testMethod || value.record.samplingMethod);
    setMethod(next === 'unknown' ? '' : next);
    setPdfId(''); setMessage(''); setViewer(false);
  }, [value.record, value.record.worksheetNo, value.record.docNo, value.recordKey, presetMethod]);

  const generate = async () => {
    setBusy(true); setMessage('');
    try {
      if (!route) throw new Error(rinse ? 'Choose Pour Plate or Membrane Filtration first' : 'No PDF template is configured for this workflow');
      const response = await fetch('/api/pdfs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: route,
          worksheetNo: String(value.record.worksheetNo || value.record.docNo || value.recordKey),
          cvContext: workflow.id === 'cv' ? { samplingFamily: cvSamplingFamily(value.record), testMethod: method } : undefined,
          data: documentPayload(route, value.record, value.samples, String(value.record.worksheetNo || value.record.docNo || value.recordKey), method)
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'PDF generation failed');
      setPdfId(result.pdfId);
      logEvent('pdf_generated', { worksheetNo: worksheet, detail: route || workflow.id });
      if (substitution) {
        noteSubstitution({
          worksheetNo: String(value.record.worksheetNo || value.record.docNo || value.recordKey),
          route: substitution.route,
          printedSpec: substitution.printedSpec,
          actualSpec: substitution.actualSpec,
          at: new Date().toISOString()
        });
      }
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'PDF generation failed'); } finally { setBusy(false); }
  };

  /* Wrapped, unlike before: with the server stopped this rejected and the
     button simply did nothing, with only an unhandled rejection in the
     console to show for it. */
  const save = async (overwrite = false) => {
    try {
      const response = await fetch(`/api/pdfs/${pdfId}/save-desktop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overwrite }) });
      if (response.status === 409 && confirm('That PDF is already on the Desktop. Replace it?')) return save(true);
      const result = await response.json();
      setMessage(response.ok ? `Saved ${result.filename}` : result.error || 'Save failed');
    } catch {
      setMessage('บันทึกไม่สำเร็จ — เซิร์ฟเวอร์บนเครื่องนี้อาจไม่ได้เปิดอยู่');
    }
  };

  const ready = canGenerate && Boolean(pdfId);
  const worksheet = String(value.record.worksheetNo || value.record.docNo || value.recordKey);

  const fileActions = <>
    <button type="button" disabled={!ready} onClick={() => {
      logEvent('pdf_printed', { worksheetNo: worksheet, detail: route || workflow.id });
      /* print-js throws inside its own XHR callback when the fetch fails, so
         no try/catch here could ever see it. Without an explicit onError a
         failed print is silent: the button is pressed and nothing happens. */
      printJS({
        printable: `/api/pdfs/${pdfId}/download?inline=1`,
        type: 'pdf',
        showModal: true,
        onError: () => setMessage('เปิดหน้าต่างพิมพ์ไม่สำเร็จ กด Download แล้วสั่งพิมพ์จากไฟล์แทน')
      });
    }}><Printer size={15} />Print</button>
    <a
      aria-disabled={!ready}
      href={ready ? `/api/pdfs/${pdfId}/download` : undefined}
      onClick={() => { if (ready) logEvent('pdf_downloaded', { worksheetNo: worksheet, detail: route || workflow.id }); }}
    ><Download size={15} />Download</a>
    <button type="button" disabled={!ready} onClick={() => save(false)}><Save size={15} />To Desktop</button>
  </>;

  return <section>
    {substitution && <p className="substitution" role="note">
      <Info size={15} aria-hidden="true" />
      <span>
        <strong>This prints on the WFI/PUS form.</strong> {substitution.reason} The
        acceptance criterion printed on it is <b>{substitution.printedSpec}</b>; this
        record&rsquo;s own criterion is <b>{substitution.actualSpec}</b>. Read the
        result against the record, not against the form, and reprint when the
        Rinse-PW membrane form is approved.
      </span>
    </p>}
    <div className="actions">
      {/* Once a preview exists on a narrow screen, opening it is the thing the
          reader wants next — not regenerating it. */}
      <button className={ready && !wide ? '' : 'primary'} type="button" disabled={!canGenerate || busy} onClick={generate}>
        <BookOpen size={15} />{busy ? 'Preparing…' : pdfId ? 'Refresh' : 'Preview PDF'}
      </button>
      {ready && <button className={wide ? '' : 'primary'} type="button" onClick={() => setViewer(true)}>
        <Maximize2 size={15} />{wide ? 'Full screen' : 'Open preview'}
      </button>}
      {fileActions}
    </div>
    {rinse && <fieldset className="method">
      <legend>Rinse test method</legend>
      <label><input type="radio" name={`${CV_METHOD_CONTROL_ID}-${value.recordKey}`} value="pour-plate" checked={method === 'pour-plate'} onChange={() => { setMethod('pour-plate'); setPdfId(''); }} />Pour Plate <small>renders on the approved PW/PRW template family</small></label>
      <label><input type="radio" name={`${CV_METHOD_CONTROL_ID}-${value.recordKey}`} value="membrane-filtration" checked={method === 'membrane-filtration'} onChange={() => { setMethod('membrane-filtration'); setPdfId(''); }} />Membrane Filtration <small>renders on the approved WFI/PUS template family</small></label>
    </fieldset>}
    {availability.reason === 'method-required' && !route && <p className="note is-warning">Choose a rinse test method before generating the PDF.</p>}
    {availability.reason === 'unsupported' && <p className="note is-warning">This record has no approved PDF route.</p>}
    {availability.reason === 'stale' && <p className="note">Fetch this record from the System DB while online to enable the PDF actions.</p>}
    {availability.reason === 'offline' && <p className="note is-warning">PDF actions are unavailable offline.</p>}
    {message && <p className="note" role="status">{message}</p>}

    {/* Inline only where there is room for it to be readable. */}
    {url && wide && <iframe className="pdf-frame" title={`Generated PDF, ${worksheet}`} src={url} />}
    {url && !wide && <p className="note" role="status"><Info size={14} />Preview ready. It opens full screen so the page is legible on this display.</p>}

    {url && viewer && <PdfViewer title={worksheet} src={url} onClose={() => setViewer(false)}>{fileActions}</PdfViewer>}
  </section>;
}

/* A generated PDF deserves the whole screen. On a narrow viewport an inline
   iframe is a 600 px-tall pinch-zoom trap that also pushes the record's own
   fields off the page, so there the preview only ever opens here; on a wide
   one this is the escape hatch from the inline panel. */
function PdfViewer({ title, src, onClose, children }: { title: string; src: string; onClose: () => void; children: React.ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !panel.current) return;
      const controls = Array.from(panel.current.querySelectorAll<HTMLElement>('button, a[href]')).filter((element) => !element.hasAttribute('disabled'));
      if (!controls.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);

  return <div className="viewer" role="dialog" aria-modal="true" aria-label={`PDF preview, ${title}`} ref={panel}>
    <header className="viewer-bar">
      <p className="viewer-title"><span className="data">{title}</span><small>Generated preview · not a released record</small></p>
      <div className="viewer-actions">{children}</div>
      <button ref={close} className="viewer-close" type="button" onClick={onClose}><X size={16} />Close</button>
    </header>
    <iframe className="viewer-frame" title={`Generated PDF, ${title}`} src={src} />
  </div>;
}

/* ============================ other pages ============================== */

/* The embed was rendered at whatever size the iframe defaulted to — a cropped
   box in the corner of an empty page. It now fills the column at a height that
   follows the viewport, and the reader can switch the two views Google gives
   us instead of being stuck in month. */
function CalendarPage() {
  const [mode, setMode] = useState<'MONTH' | 'AGENDA'>('MONTH');
  const today = new Date();
  const long = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok'
  }).format(today);
  const week = Math.ceil(((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);

  return <div className="page wide">
    <header className="masthead">
      <h1>Calendar</h1>
      <p>The shared laboratory calendar, Asia/Bangkok. Events are read from Google and are not cached for offline use.</p>
    </header>

    <div className="cal-bar">
      <p className="cal-today">
        <CalendarDays size={16} aria-hidden="true" />
        <span>{long}</span>
        <span className="data">week {week}</span>
      </p>
      <div className="cal-modes" role="group" aria-label="Calendar view">
        {(['MONTH', 'AGENDA'] as const).map((value) => <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
        >{value === 'MONTH' ? 'Month' : 'Schedule'}</button>)}
      </div>
      <a
        className="text-link"
        href={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Asia%2FBangkok`}
        target="_blank"
        rel="noreferrer"
      >Open in Google Calendar <ExternalLink size={13} /></a>
    </div>

    <CalendarEmbed mode={mode} />
  </div>;
}

/* This page had no styles at all — `.tool-list` was never written, so every
   link ran together as one paragraph of bold and plain text. Rebuilt as two
   labelled groups, because the difference that matters is whether a thing
   leaves this workspace or stays inside it. */
function ToolsPage() {
  return <div className="page wide">
    <header className="masthead">
      <h1>Tools</h1>
      <p>Everything this workspace links to. The first group is owned elsewhere and opens in a new tab; the second stays here.</p>
    </header>

    <section className="tool-group">
      <h2>Owned elsewhere</h2>
      <div className="tool-grid">
        {tools.map((tool) => <ToolLink key={tool.label} tool={tool} />)}
      </div>
    </section>

    <section className="tool-group">
      <h2>In this workspace</h2>
      <div className="tool-grid">
        <Link className="tool-card" to="/inventory">
          <span className="tool-name">Inventory</span>
          <span className="tool-detail">Search the reviewed local catalogue</span>
          <span className="tool-go">Open <ChevronRight size={14} /></span>
        </Link>
        <Link className="tool-card" to="/games">
          <span className="tool-name">Games</span>
          <span className="tool-detail">เกมฝึกทักษะจุลชีววิทยา — เล่นออฟไลน์ ไม่ใช่เครื่องมืออนุมัติ</span>
          <span className="tool-go">Open <ChevronRight size={14} /></span>
        </Link>
      </div>
    </section>

    <ReprintList />
  </div>;
}

/* Which worksheets were printed on a form that does not carry their own
   acceptance criterion, so they can be reprinted when the Rinse-PW membrane
   form is approved. Local to this browser; hidden until there is one. */
function ReprintList() {
  const [rows, setRows] = useState(readSubstitutions);
  useEffect(() => {
    const sync = () => setRows(readSubstitutions());
    window.addEventListener('anf3:substituted', sync);
    return () => window.removeEventListener('anf3:substituted', sync);
  }, []);
  if (!rows.length) return null;

  const download = () => {
    const blob = new Blob([substitutionCsv()], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `anf3-reprint-when-form-approved-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return <section className="reprint">
    <h2>Reprint when the Rinse-PW membrane form is approved</h2>
    <p>
      {rows.length} worksheet{rows.length === 1 ? '' : 's'} printed from this browser on the
      WFI/PUS form, which carries a different acceptance criterion. Keep this list until the
      new form exists, then reprint them.
    </p>
    <ul>
      {rows.slice(0, 12).map((row) => <li key={row.worksheetNo}>
        <span className="data">{row.worksheetNo}</span>
        <small>printed {row.printedSpec} · record is {row.actualSpec}</small>
      </li>)}
    </ul>
    {rows.length > 12 && <p><small>and {rows.length - 12} more in the export.</small></p>}
    <button type="button" onClick={download}><Download size={15} />Export CSV</button>
  </section>;
}

type CatalogItem = { sequence: number; materialCode: string; name: string; unit: string; page: number; reviewed: boolean };

function InventoryPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState<{ indexAvailable?: boolean; hashMatches?: boolean; pdfUrl?: string; indexUrl?: string; rowCount?: number }>({});
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const state = await fetch('/api/catalog/status').then((response) => response.json());
      setStatus(state);
      if (catalogIndexUsable(state)) {
        const index = await fetch(state.indexUrl || '/catalog/inventory-index.json').then((response) => response.json());
        setItems(index.items || []);
      }
    })().catch(() => setStatus({ pdfUrl: '/inventory_catalog.pdf' }));
  }, []);

  const hits = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return items.filter((item) => !needle || `${item.materialCode} ${item.name}`.toLocaleLowerCase().includes(needle));
  }, [items, query]);
  const usable = catalogIndexUsable(status);

  return <div className="page wide">
    <header className="masthead">
      <h1>Inventory</h1>
      <p>Search the reviewed index, then read the original page in the catalogue. The index is hash-gated against the PDF it came from.</p>
    </header>
    <div className="stock">
      <aside>
        <label className="stock-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Material code or name" disabled={!usable} /></label>
        {!usable && <p className="note is-warning">The catalogue changed, or the reviewed index is unavailable. The original PDF is still open beside this.</p>}
        <div className="stock-hits">{hits.map((item) => <button key={item.materialCode} type="button" aria-current={page === item.page} onClick={() => setPage(item.page)}>
          <span><strong>{item.materialCode}</strong><small>{item.name}</small></span>
          <span className="unit">{item.unit}<small>p.{item.page}</small></span>
        </button>)}</div>
      </aside>
      <section>
        <div className="pager">
          <span>Original catalogue</span>
          <label>Page <input type="number" min="1" max="16" value={page} onChange={(event) => setPage(Math.min(16, Math.max(1, Number(event.target.value))))} /> / 16</label>
        </div>
        <iframe className="catalog-frame" title="Inventory catalogue" src={`${status.pdfUrl || '/inventory_catalog.pdf'}#page=${page}`} />
      </section>
    </div>
  </div>;
}

function DocumentCodePage() {
  const rows = [['QP', 'Quality Procedure'], ['WI', 'Work Instruction'], ['FM', 'Form'], ['LG', 'Log']];
  return <div className="page">
    <header className="masthead"><h1>Document codes</h1><p>Reference only. Reserve a controlled number through Document booking in Tools.</p></header>
    <div className="spec">{rows.map(([code, name]) => <div key={code}><b>{code}</b><span>{name}</span></div>)}</div>
  </div>;
}

function MasterDataPage() {
  return <div className="page">
    <header className="masthead"><h1>Master data</h1><p>Master data belongs to the source Google Sheets. This page deliberately does not make a second, editable copy of it.</p></header>
    <div className="callout">
      <h2>Open the controlled database</h2>
      <p>Use Stock DB, or the System DB for the workflow you are working in.</p>
      <Link className="text-link" to="/tools">Go to Tools <ArrowRight size={14} /></Link>
    </div>
  </div>;
}

function NotFound() {
  return <div className="page"><div className="state"><X size={22} /><h2>That page does not exist</h2><Link className="text-link" to="/">Back to the shelf</Link></div></div>;
}

function Loading() { return <div className="page"><p className="state is-loading"><RefreshCw size={18} /><span>Loading…</span></p></div>; }

function display(value: unknown) {
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const router = createHashRouter([{
  path: '/', element: <Shell />, children: [
    { index: true, element: <DeskPage /> },
    { path: 'binder/:binderId', element: <BinderPage /> },
    { path: 'records/:domain', element: <DomainPage /> },
    { path: 'records/:domain/:workflow', element: <RecordsPage /> },
    { path: 'records/:domain/:workflow/:recordKey', element: <RecordsPage /> },
    { path: 'calendar', element: <CalendarPage /> },
    { path: 'tools', element: <ToolsPage /> },
    { path: 'inventory', element: <InventoryPage /> },
    { path: 'document-code', element: <DocumentCodePage /> },
    { path: 'master-data', element: <MasterDataPage /> },
    { path: 'activity', element: <ActivityPage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: 'games', element: <Suspense fallback={<Loading />}><GamesHub /></Suspense> },
    { path: 'games/bacterial-identification', element: <Suspense fallback={<Loading />}><BacterialIdentificationGame /></Suspense> },
    { path: 'games/excursion-trace', element: <Suspense fallback={<Loading />}><ExcursionTraceGame /></Suspense> },
    { path: 'games/report/:packetId', element: <Suspense fallback={<Loading />}><GameReportPage /></Suspense> },
    { path: 'games/feller', element: <Navigate to="/games/bacterial-identification" replace /> },
    /* CultureCheck was removed in v7.1n — it shared six of nine phases with
       The Sixth Plate, so it was two names for one game. The path stays as a
       redirect so an old bookmark lands on the game that replaced it. The
       frozen legacy page at games/growth-promotion.html is a different
       artefact and is untouched. */
    { path: 'games/growth-promotion', element: <Navigate to="/games/bacterial-identification" replace /> },
    { path: '*', element: <NotFound /> }
  ]
}]);

export default function App() { return <RouterProvider router={router} />; }
