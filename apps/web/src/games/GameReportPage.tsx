import { ArrowLeft, Printer, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEvidencePacket } from './persistence';
import type { EvidencePacket } from './types';
import './games.css';

export default function GameReportPage() {
  const { packetId } = useParams();
  const [packet, setPacket] = useState<EvidencePacket | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; if (!packetId) { setLoading(false); return; } void getEvidencePacket(packetId).then((value) => { if (active) { setPacket(value); setLoading(false); } }); return () => { active = false; }; }, [packetId]);

  if (loading) return <div className="report-state" role="status">กำลังโหลดรายงานในเครื่อง…</div>;
  if (!packet) return <div className="report-state"><h1>ไม่มีรายงาน</h1><p>ไม่พบชุดหลักฐานนี้ในที่เก็บข้อมูลฝึกอบรมของเบราว์เซอร์นี้</p><Link className="text-link" to="/games">กลับไปหน้าเกม</Link></div>;

  const score = packet.score;
  return <article className="game-report">
    <header className="report-header">
      <div><p className="games-kicker">ANF3 · ชุดหลักฐานเพื่อการฝึกอบรม</p><h1>{packet.scenarioTitle}</h1><p>{packet.simulation}</p></div>
      <div className="report-actions"><button type="button" className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />พิมพ์ / บันทึก PDF</button><Link className="btn quiet" to="/games"><ArrowLeft size={16} aria-hidden="true" />กลับไปหน้าเกม</Link></div>
    </header>
    <div className="notice"><ShieldCheck size={18} aria-hidden="true" /><span>Training-only report. Fictional scenario; not a laboratory record and not a release or shutdown authorisation.</span></div>
    <dl className="fact-grid report-meta"><div><dt>สถานการณ์</dt><dd className="data">{packet.scenarioId}</dd></div><div><dt>ชุดเนื้อหา</dt><dd className="data">{packet.profileId}</dd></div><div><dt>โหมด</dt><dd>{packet.role} · {packet.difficulty}</dd></div><div><dt>ส่งออกแล้ว</dt><dd>{new Date(packet.exportedAt).toLocaleString()}</dd></div></dl>
    <section className="report-section"><h2>การตัดสิน</h2><pre>{JSON.stringify(packet.decision, null, 2)}</pre></section>
    <section className="report-section">
      <h2>Score · {score.total}/100</h2>
      {score.ceiling && <p className="report-warning">Score ceiling: {score.ceiling}</p>}
      <div className="report-score-table">{score.domains.map((domain) => <div key={domain.label}><span>{domain.label}</span><strong className="data">{domain.earned}/{domain.available}</strong></div>)}</div>
      {score.criticalErrors.length > 0 && <div className="report-warning"><strong>สิ่งที่พบระดับวิกฤต</strong><ul>{score.criticalErrors.map((finding) => <li key={finding}>{finding}</li>)}</ul></div>}
    </section>
    <section className="report-section">
      <h2>หลักฐานที่เก็บได้</h2>
      <div className="report-evidence">{packet.evidence.map((item) => <article key={item.id}><div><strong className="data">{item.id}</strong><span className={`report-status is-${item.validity}`}>{item.validity}</span></div><h3>{item.source}</h3><p>{item.observation}</p>{item.interpretation && <small>{item.interpretation}</small>}</article>)}</div>
    </section>
    <section className="report-section">
      <h2>ประวัติการทำงาน</h2>
      <ol className="report-audit">{packet.audit.map((event) => <li key={event.id}><strong>{event.action}</strong><span>{event.detail}</span><time className="data">{new Date(event.at).toLocaleString()}</time></li>)}</ol>
    </section>
    <footer className="report-footer">{packet.trainingOnly ? 'Educational simulation only. Consult the current approved procedure and qualified supervision for real work.' : ''}</footer>
  </article>;
}
