import { ArrowRight, Microscope, ShieldCheck, Waypoints } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BACTERIAL_CASES, EDUCATIONAL_PROFILE } from './content';
import { EXCURSION_CASES } from './excursionContent';
import './games.css';

const scoredExcursionCases = EXCURSION_CASES.filter((item) => !item.orientationOnly).length;

export default function GamesHub() {
  return <div className="games-hub page wide" lang="th">
    <header className="games-heading">
      <div>
        <p className="games-kicker">เกมฝึกจุลชีววิทยา ANF3</p>
        <h1>ดูหลักฐาน อย่าเดาจากสี</h1>
        <p>เกมสืบสวน 2 ชุด เล่นบนเครื่องนี้ ไม่ต้องต่อเน็ต ฝึกให้สรุปผลเท่าที่หลักฐานบอก ไม่ใช่เท่าที่เดา ทุกเคสเป็นเรื่องแต่ง เล่นกี่ครั้งก็ได้ผลเหมือนเดิม และไม่แตะบันทึกจริงเลย</p>
        <p>เลือกระดับได้ในแถบบนของเกม <strong>เริ่มต้น</strong> สำหรับพนักงานใหม่ บอกหน้าที่ของอาหารเลี้ยงเชื้อและเตือนก่อนส่ง <strong>ทบทวน</strong> คือค่าตั้งต้นสำหรับคนมีประสบการณ์ ส่งเลยไม่มีคำเตือน <strong>ยาก</strong> ตัดคำใบ้ออก ลด action และหักคะแนนหนักขึ้นเมื่อสรุปเกินหลักฐาน</p>
      </div>
      <ShieldCheck size={30} aria-hidden="true" />
    </header>

    <div className="training-boundary">
      <strong>ขอบเขตของการฝึก</strong>
      <p>นี่คือเกมฝึก <strong>ไม่ใช่</strong>เครื่องมืออนุมัติผล ห้ามใช้แทนตำรามาตรฐาน SOP วิธีที่ validate แล้ว หรือการตรวจสอบโดยหัวหน้า และไม่แตะบันทึกจริง LIMS หรือ System DB</p>
    </div>

    <section className="campaign-list" aria-label="ชุดเกมฝึกทักษะ">

      <article className="campaign-row panel-in" data-accent="identification">
        <span className="campaign-icon"><Microscope size={22} aria-hidden="true" /></span>
        <div className="campaign-body">
          <h2>The Sixth Plate — แฟ้มคดีจุลินทรีย์</h2>
          <p>ตั้งสมมติฐานไว้หลายทางก่อน แล้วเลือกอาหารเลี้ยงเชื้อที่แยกออกจากกันได้ จดผลก่อนแล้วค่อยตีความ และบอกชื่อเชื้อได้เท่าที่อาหารที่ใช้พิสูจน์ได้จริง</p>
          <div className="campaign-facts"><span><strong className="data">{BACTERIAL_CASES.length}</strong> คดี</span><span>ลำดับ RV → XLD</span><span>เช็คเชื้อปน</span></div>
        </div>
        <Link className="campaign-cta" to="/games/bacterial-identification">เริ่มเล่น<ArrowRight size={16} aria-hidden="true" /></Link>
      </article>

      <article className="campaign-row panel-in" data-accent="excursion">
        <span className="campaign-icon"><Waypoints size={22} aria-hidden="true" /></span>
        <div className="campaign-body">
          <h2>Excursion Trace — สืบสวนห้องสะอาด</h2>
          <p>ผล EM ห้องสะอาดเกินเกณฑ์ หาว่าใบไหนเกินจริง ไล่ดูว่าเชื้อน่าจะเข้ามาทางไหน แล้วเลือก CAPA ที่แก้ต้นเหตุ ไม่ใช่แค่แก้ปลายเหตุ</p>
          <div className="campaign-facts"><span><strong className="data">{scoredExcursionCases}</strong> รอบ</span><span>แก้ค่าอากาศด้วย Feller</span><span>เช็คการส่งต่อตัวอย่าง</span></div>
        </div>
        <Link className="campaign-cta" to="/games/excursion-trace">เริ่มเล่น<ArrowRight size={16} aria-hidden="true" /></Link>
      </article>
    </section>

    <footer className="games-profile data">ชุดเนื้อหา {EDUCATIONAL_PROFILE.displayName} · ใช้ตั้งแต่ {EDUCATIONAL_PROFILE.effectiveDate} · ไม่ต่อระบบจริง · ไม่ใช้ AI ให้คะแนน · เก็บความคืบหน้าไว้ในเครื่องนี้</footer>
  </div>;
}
