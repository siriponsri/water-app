import type { CapaOption, ExcursionCase, ExcursionGrade, ExcursionMethod, SamplePointDef } from './excursionTypes';

/**
 * FICTIONAL TRAINING FIXTURE. These grades, rooms, sampling points and action
 * limits describe a synthetic facility built only for this simulation. They
 * are not the current approved EM programme, not a validated classification,
 * and must never be read as real limits for any GPO site.
 */
export const TRAINING_FIXTURE_NOTICE = 'Every grade, room, limit and reading below is a fictional training fixture invented for this simulation. It is not the approved environmental-monitoring programme, not a validated classification, and not a release or shutdown authorisation.';

export const GRADES: Array<{ id: ExcursionGrade; label: string; detail: string }> = [
  { id: 'A', label: 'Grade A', detail: 'แกนกลางของโจทย์ — โซนสัมผัสโดยตรง เสี่ยงสูงสุด' },
  { id: 'B', label: 'Grade B', detail: 'พื้นที่พื้นหลังในโจทย์ ที่ล้อมรอบแกน Grade A' },
  { id: 'C', label: 'Grade C', detail: 'พื้นที่ในโจทย์ที่รองรับทางเดินและห้อง gowning' },
  { id: 'D', label: 'Grade D', detail: 'ทางเดินรอบนอกและทางเข้าคนในโจทย์' }
];

export const METHOD_LABELS: Record<ExcursionMethod, string> = {
  settle_plate: 'Settle plate',
  contact_plate: 'Contact plate',
  active_air: 'Active air (holes)',
  glove_print: 'Glove print',
  surface_swab: 'Surface swab'
};

/** Fictional training action limits, in CFU (or corrected CFU for active_air). */
export const ACTION_LIMITS: Record<ExcursionGrade, Record<ExcursionMethod, number>> = {
  A: { settle_plate: 1, contact_plate: 1, active_air: 1, glove_print: 1, surface_swab: 1 },
  B: { settle_plate: 5, contact_plate: 5, active_air: 10, glove_print: 5, surface_swab: 5 },
  C: { settle_plate: 50, contact_plate: 25, active_air: 100, glove_print: 25, surface_swab: 25 },
  D: { settle_plate: 100, contact_plate: 50, active_air: 200, glove_print: 50, surface_swab: 50 }
};

export const SAMPLE_POINTS: SamplePointDef[] = [
  { id: 'p-d-corridor', label: 'พื้น Corridor D-1', room: 'Corridor D-1 (outer)', grade: 'D', method: 'settle_plate', x: 12, y: 50 },
  { id: 'p-d-door', label: 'ธรณีประตูทางเข้า', room: 'Corridor D-1 (outer)', grade: 'D', method: 'contact_plate', x: 20, y: 18 },
  { id: 'p-airlock1', label: 'พื้น Airlock 1', room: 'Airlock 1 (personnel)', grade: 'C', method: 'settle_plate', x: 27, y: 50 },
  { id: 'p-mech-gallery', label: 'ช่องลมกลับ HVAC', room: 'Mechanical gallery', grade: 'C', method: 'active_air', x: 42, y: 15 },
  { id: 'p-gown-bench', label: 'ผิวหน้า Gowning bench', room: 'Gowning & support', grade: 'C', method: 'contact_plate', x: 42, y: 45 },
  { id: 'p-gown-floor', label: 'พื้นห้อง gowning', room: 'Gowning & support', grade: 'C', method: 'settle_plate', x: 42, y: 65 },
  { id: 'p-drain', label: 'ตะแกรงท่อระบายน้ำ', room: 'Utility penetration', grade: 'C', method: 'surface_swab', x: 42, y: 85 },
  { id: 'p-airlock2', label: 'พื้น Airlock 2', room: 'Airlock 2 (material)', grade: 'B', method: 'settle_plate', x: 57, y: 50 },
  { id: 'p-corridor-b', label: 'พื้น Corridor B-1', room: 'Corridor B-1', grade: 'B', method: 'settle_plate', x: 70, y: 22 },
  { id: 'p-glove-b', label: 'glove print ของพนักงาน', room: 'Corridor B-1', grade: 'B', method: 'glove_print', x: 70, y: 68 },
  { id: 'p-fill-floor', label: 'พื้นรอบนอกห้องบรรจุ', room: 'Corridor B-1', grade: 'B', method: 'contact_plate', x: 80, y: 88 },
  { id: 'p-rabs-face', label: 'หน้า RABS glove-port', room: 'Filling suite (Grade A)', grade: 'A', method: 'contact_plate', x: 91, y: 38 },
  { id: 'p-hepa', label: 'หน้า HEPA โซนบรรจุ', room: 'Filling suite (Grade A)', grade: 'A', method: 'active_air', x: 91, y: 64 }
];

export const SAMPLE_POINT_BY_ID = Object.fromEntries(SAMPLE_POINTS.map((point) => [point.id, point])) as Record<string, SamplePointDef>;

export const CAPA_OPTIONS: CapaOption[] = [
  { id: 'monitor-continue', label: 'บันทึกผลไว้ แล้วเฝ้าระวังตามปกติต่อไป', detail: 'ไม่มีหลักฐานว่าเกินค่าจำกัด ถ้าเปิดสอบสวนก็เท่ากับสร้างเรื่องขึ้นมาเอง' },
  { id: 'retrain-gowning', label: 'อบรมวิธี gowning ให้ทีมที่เกี่ยวข้องใหม่', detail: 'ใช้กับผลผิดปกติจุดเดียวในห้อง gowning ที่ไม่ลามไปไหนต่อ' },
  { id: 'repair-airlock-interlock', label: 'ตรวจและซ่อม interlock ของ airlock', detail: 'ใช้กับกรณีที่มีบันทึกว่า interlock หรือลำดับการเปิดประตูเสีย' },
  { id: 'investigate-personnel-flow', label: 'เปิดสอบสวน deviation เรื่องการเดินของคน', detail: 'ใช้กับเส้นทางหลายจุดที่ไล่ตามคนเดินไปทั่วโรงงาน' },
  { id: 'utility-penetration-review', label: 'ตรวจซีลจุดที่ท่อทะลุผนัง และ trap ท่อระบายน้ำ', detail: 'ใช้กับโจทย์ที่ชี้ไปทางงานระบบ หรือช่องทางเข้าทางเครื่องกล' },
  { id: 'enhanced-clean-revalidate', label: 'ทำความสะอาดจุดที่มีปัญหาแบบเข้ม แล้วตรวจรับรองใหม่', detail: 'ใช้กับผลผิดปกติที่แยกกันอยู่ ไม่ติดกัน และเล่าเป็นเรื่องเดียวไม่ได้' },
  { id: 'escalate-qa-shutdown', label: 'ส่งเรื่องให้ QA เพื่อสั่งหยุดไลน์ Grade A/B', detail: 'ใช้เฉพาะกรณีเจอผลผิดปกติที่ Grade A บนเส้นทางการเข้ามาของเชื้อที่ยืนยันแล้วและเชื่อมถึงกัน' }
];

const readings = (entries: ExcursionCase['readings']) => entries;

export const EXCURSION_CASES: ExcursionCase[] = [
  {
    id: 'excursion-0-orientation', number: 0, title: 'ปฐมนิเทศ: อ่านผังจุดเก็บในโจทย์', shortTitle: 'อ่านผังก่อน',
    briefing: 'ก่อนจะลงรอบไหน ให้รู้จักโรงงานในโจทย์ก่อน มีสี่ grade ห้าวิธีเก็บตัวอย่าง และตารางค่าจำกัดสำหรับฝึกอบรมอีกหนึ่งตาราง ตรงนี้ยังไม่มีค่าอ่านจริงสักค่า',
    question: 'จุดที่ทำเครื่องหมายไว้ แต่ละจุดเป็น Grade อะไร เก็บด้วยวิธีไหน',
    readings: {}, expectedPathIds: [], supportedCapaId: 'monitor-continue',
    capaRationale: 'ปฐมนิเทศไม่มีค่าอ่านใด ๆ จึงไม่มีการดำเนินการใดที่ต้องทำหรือมีหลักฐานรองรับ',
    unsupportedNote: '', principle: 'ค่าจำกัดในการฝึกจะมีความหมาย ก็ต่อเมื่อบอกได้ว่าเป็น Grade อะไร เก็บด้วยวิธีไหน และมาจากจุดไหนในโจทย์',
    orientationOnly: true
  },
  {
    id: 'excursion-1-gowning-outlier', number: 1, title: 'Case 01 — จุดผิดปกติในห้อง gowning', shortTitle: 'จุดผิดปกติในห้อง gowning', seed: 'TRACE-1004',
    briefing: 'รอบ EM ประจำสัปดาห์ผ่านหมด ยกเว้น contact plate หนึ่งใบบน gowning bench จุดอื่นทั้งโรงงานอ่านได้ต่ำกว่าค่าจำกัดในโจทย์อยู่มาก',
    question: 'ต้องไปหาจุดเกินค่าจำกัดอีกจุดที่อื่นในโรงงานก่อน ถึงจะปิดเรื่องนี้ได้หรือเปล่า',
    readings: readings({
      'p-d-corridor': { count: 2 }, 'p-d-door': { count: 1 }, 'p-airlock1': { count: 3 },
      'p-mech-gallery': { count: 4, totalHoles: 400 }, 'p-gown-bench': { count: 28 }, 'p-gown-floor': { count: 12 },
      'p-drain': { count: 6 }, 'p-airlock2': { count: 1 }, 'p-corridor-b': { count: 0 }, 'p-glove-b': { count: 1 },
      'p-fill-floor': { count: 0 }, 'p-rabs-face': { count: 0 }, 'p-hepa': { count: 0, totalHoles: 400 }
    }),
    expectedPathIds: ['p-gown-bench'], supportedCapaId: 'retrain-gowning',
    capaRationale: 'contact plate เกินค่าจำกัดใบเดียวบน gowning bench ส่วนจุดข้างเคียงปกติหมด แบบนี้หลักฐานรองรับแค่การอบรมซ้ำเฉพาะจุด ไม่ใช่การสอบสวนว่ามีการปนเปื้อนลุกลาม',
    unsupportedNote: 'เจอผลผิดปกติจุดเดียวที่ไม่เชื่อมกับอะไร แล้วไปเปิดสอบสวนเรื่องการเดินของคนหรือสั่งหยุดไลน์ เท่ากับปั้นเรื่องให้ใหญ่เกินที่หลักฐานบอก',
    principle: 'จุดเกินค่าจำกัดจุดเดียวโดด ๆ เป็นแค่ผลผิดปกติ ไม่ใช่เส้นทาง อย่าเอาไปต่อกับจุดอื่นที่ค่ายังปกติ'
  },
  {
    id: 'excursion-2-clean-round', number: 2, title: 'Case 02 — รอบที่ผ่านหมด', shortTitle: 'รอบที่ผ่านหมด', seed: 'TRACE-2019',
    briefing: 'ทุกจุดในรอบนี้ รวมทั้งค่ารูของ active air อ่านได้อยู่ในค่าจำกัดของโจทย์ทั้งหมด — ต่อให้ใส่ Feller correction ในจุดที่ต้องใส่แล้วก็ตาม',
    question: 'รอบที่ผ่านทุกจุด หลักฐานรองรับอะไรได้บ้าง',
    readings: readings({
      'p-d-corridor': { count: 8 }, 'p-d-door': { count: 3 }, 'p-airlock1': { count: 2 },
      'p-mech-gallery': { count: 9, totalHoles: 400 }, 'p-gown-bench': { count: 4 }, 'p-gown-floor': { count: 6 },
      'p-drain': { count: 3 }, 'p-airlock2': { count: 1 }, 'p-corridor-b': { count: 1 }, 'p-glove-b': { count: 0 },
      'p-fill-floor': { count: 0 }, 'p-rabs-face': { count: 0 }, 'p-hepa': { count: 0, totalHoles: 400 }
    }),
    expectedPathIds: [], supportedCapaId: 'monitor-continue',
    capaRationale: 'ไม่มีจุดไหนในรอบนี้เกินค่าจำกัดในโจทย์ รวมถึงค่า active air ที่แก้แล้วด้วย หลักฐานรองรับได้แค่การเฝ้าระวังตามปกติเท่านั้น',
    unsupportedNote: 'จุดที่ค่าอยู่ในเกณฑ์แล้ว ยังไปตีธงว่า "กันไว้ก่อน" เท่ากับสร้างผลเกินค่าจำกัดที่โจทย์ไม่เคยให้มา',
    principle: 'การไม่ตีความเกินก็เป็นผลอย่างหนึ่ง รอบที่ทุกจุดผ่านไม่ได้แปลว่ารายงานอ่อน แต่แปลว่ารายงานถูกต้อง'
  },
  {
    id: 'excursion-3-airlock-breach', number: 3, title: 'Case 03 — จาก Airlock 2 ถึง glove port', shortTitle: 'airlock รั่ว', seed: 'TRACE-3041',
    briefing: 'เจอว่า Airlock 2 ถูกหนีบ interlock ค้างให้ประตูเปิดไว้ทั้งคืน รอบเก็บหลังจากนั้นเห็นร่องรอยที่ไล่สูงขึ้นจาก airlock นั้น ผ่าน Corridor B-1 ไปทาง RABS glove port และยังมี swab ท่อระบายน้ำอีกจุดหนึ่งที่อื่นเกินค่าจำกัด บันทึกไว้ในกะเดียวกัน',
    question: 'จุดไหนเป็นส่วนหนึ่งของเรื่อง airlock รั่ว และจุดไหนเป็นผลผิดปกติคนละเรื่องที่ไม่เกี่ยวกัน',
    readings: readings({
      'p-d-corridor': { count: 3 }, 'p-d-door': { count: 2 }, 'p-airlock1': { count: 1 },
      'p-mech-gallery': { count: 5, totalHoles: 400 }, 'p-gown-bench': { count: 3 }, 'p-gown-floor': { count: 4 },
      'p-drain': { count: 30 }, 'p-airlock2': { count: 9 }, 'p-corridor-b': { count: 8 }, 'p-glove-b': { count: 7 },
      'p-fill-floor': { count: 1 }, 'p-rabs-face': { count: 3 }, 'p-hepa': { count: 0, totalHoles: 400 }
    }),
    expectedPathIds: ['p-airlock2', 'p-corridor-b', 'p-glove-b', 'p-rabs-face'], supportedCapaId: 'repair-airlock-interlock',
    capaRationale: 'มีบันทึกว่า interlock เสียจริง และค่าที่เกินก็ไล่สูงขึ้นไปในทิศทางเดียว จาก Airlock 2 ผ่านทางเดินไปจนถึงหน้า glove port การซ่อม interlock จึงตรงกับสาเหตุรากที่โจทย์ชี้ไป',
    unsupportedNote: 'จุด swab ท่อระบายน้ำที่เกินค่าจำกัด อยู่คนละห้อง เก็บคนละวิธี และไม่มีร่องรอยที่ไล่สูงขึ้นเชื่อมถึงกัน — เป็นผลผิดปกติอีกเรื่องหนึ่งต่างหาก ไม่ได้อยู่ในเรื่อง airlock รั่วนี้',
    principle: 'เส้นทางคือร่องรอยที่ไล่สูงขึ้นและมีสาเหตุรากที่บันทึกไว้ ไม่ใช่ทุกจุดที่เกินค่าจำกัดในกะเดียวกัน'
  },
  {
    id: 'excursion-4-feller-trap', number: 4, title: 'Case 04 — หลุมพราง Feller correction', shortTitle: 'หลุมพราง Feller', seed: 'TRACE-4087',
    briefing: 'ตัวอย่าง active air ที่ชั้นงานระบบ อ่านได้ 95 รูบวก จาก 400 รู บนเครื่อง sieve ในโจทย์ ตัวเลข 95 ดูสบาย ๆ ต่ำกว่าค่าจำกัด Grade C ที่ 100 — จนกว่าจะเอาจำนวนรูบวกไปเข้า Feller correction ที่คิดเผื่อกรณีอนุภาคตกลงรูเดียวกันหลายครั้ง',
    question: 'พอแก้ค่าแล้ว ข้อสรุปที่รอบนี้รองรับเปลี่ยนไปไหม',
    readings: readings({
      'p-d-corridor': { count: 4 }, 'p-d-door': { count: 2 }, 'p-airlock1': { count: 2 },
      'p-mech-gallery': { count: 95, totalHoles: 400 }, 'p-gown-bench': { count: 3 }, 'p-gown-floor': { count: 5 },
      'p-drain': { count: 4 }, 'p-airlock2': { count: 1 }, 'p-corridor-b': { count: 2 }, 'p-glove-b': { count: 1 },
      'p-fill-floor': { count: 0 }, 'p-rabs-face': { count: 0 }, 'p-hepa': { count: 0, totalHoles: 400 }
    }),
    expectedPathIds: ['p-mech-gallery'], supportedCapaId: 'utility-penetration-review',
    capaRationale: 'จำนวนรูดิบ 95 รู อยู่ต่ำกว่าค่าจำกัดในโจทย์ แต่พอเอาไปทำ Feller correction ซึ่งคิดเผื่อรูที่โดนซ้ำมากกว่าหนึ่งครั้ง ค่าที่ได้ก็เกินค่าจำกัดไป ชั้นงานระบบเป็นทางที่ท่อทะลุผนัง หลักฐานรองรับให้ไปตรวจซีลตรงนั้น',
    unsupportedNote: 'ถ้าตัดสินว่าจุดนี้ผ่านโดยดูแค่จำนวนรูดิบ ๆ ก็เท่ากับไม่สนใจว่าเครื่องแบบ sieve ทำงานยังไงตอนใกล้อิ่มตัว แต่ละรูนับได้ครั้งเดียวเท่านั้น ต่อให้มีอนุภาคตกลงไปกี่ตัวก็ตาม',
    principle: 'ค่า active air ที่ใกล้จำนวนรูของเครื่อง ต้องทำ Feller correction ก่อนเอาไปเทียบค่าจำกัด ไม่ใช่ทำทีหลัง'
  },
  {
    id: 'excursion-5-scattered', number: 5, title: 'Case 05 — ผลผิดปกติสี่จุดที่ไม่เกี่ยวกัน', shortTitle: 'ผลผิดปกติกระจัดกระจาย', seed: 'TRACE-5063',
    briefing: 'สี่จุด อยู่คนละห้อง เก็บคนละวิธี ทุกจุดอ่านได้เกินค่าจำกัดในโจทย์นิดหน่อย ไม่มีอะไรไล่สูงขึ้นไปในทิศทางเดียวกัน และไม่มีบันทึกว่า interlock ซีล หรือการ gowning มีปัญหา',
    question: 'เกินค่าจำกัดสี่จุดที่กระจายกันอยู่ หลักฐานรองรับให้สอบสวนเรื่องเดียว หรือสี่เรื่องเล็ก ๆ',
    readings: readings({
      'p-d-corridor': { count: 3 }, 'p-d-door': { count: 55 }, 'p-airlock1': { count: 2 },
      'p-mech-gallery': { count: 150, totalHoles: 400 }, 'p-gown-bench': { count: 3 }, 'p-gown-floor': { count: 4 },
      'p-drain': { count: 27 }, 'p-airlock2': { count: 1 }, 'p-corridor-b': { count: 1 }, 'p-glove-b': { count: 6 },
      'p-fill-floor': { count: 0 }, 'p-rabs-face': { count: 0 }, 'p-hepa': { count: 0, totalHoles: 400 }
    }),
    expectedPathIds: [], supportedCapaId: 'enhanced-clean-revalidate',
    capaRationale: 'เกินค่าจำกัดสี่จุด ไม่มีร่องรอยร่วมกัน ไม่มีโน้ตกะเดียวกัน ไม่มีทิศทางที่ไล่สูงขึ้น แบบนี้คือผลผิดปกติเฉพาะจุดสี่เรื่อง การทำความสะอาดแล้วตรวจรับรองใหม่ทีละจุดตรงกับหลักฐาน ส่วนการดันเรื่องให้เป็นระดับทั้งโรงงานไม่ตรง',
    unsupportedNote: 'จะเอาห้องที่ไม่เกี่ยวกันมาร้อยเป็นเส้นทางเดียว หรือจะดันไปถึงขั้นหยุดไลน์ Grade A/B ก็พูดเกินหลักฐานทั้งคู่ เพราะนี่คือผลผิดปกติเฉพาะจุดสี่จุดที่ไม่เชื่อมกัน',
    principle: 'เกินค่าจำกัดหลายจุดไม่ได้แปลว่าเป็นเรื่องเดียวกันเสมอ เส้นทางต้องมีทิศทาง จุดที่กระจัดกระจายไม่มีทิศทาง'
  },
  {
    id: 'excursion-6-broken-chain', number: 6, title: 'Case 06 — โจทย์รวบยอด: เพลตที่ถูกเปลี่ยนป้าย', shortTitle: 'โจทย์รวบยอด: chain of custody ขาด', seed: 'TRACE-6112',
    briefing: 'ร่องรอยที่ไล่สูงขึ้นวิ่งจากธรณีประตูทางเข้า ผ่าน Airlock 1 เข้าไปในห้อง gowning และไปจบที่ contact plate ของ RABS glove-port ซึ่งเป็น Grade A อ่านได้เกินค่าจำกัดไปไกล แต่ป้ายของเพลตใบสุดท้ายนั้นถูกแก้กลางกะ หลังจากสลับกับตัวอย่างอื่นที่ไม่เกี่ยวกัน สายโยงกลับไปหา RABS จึงขาด',
    question: 'เพลต Grade A ที่ติดป้ายผิด เอามาใช้อ้างสั่งหยุดไลน์ได้ไหม หรือเส้นทางต้องจบก่อนหน้านั้นหนึ่งก้าว',
    readings: readings({
      'p-d-corridor': { count: 5 }, 'p-d-door': { count: 58 }, 'p-airlock1': { count: 61 },
      'p-mech-gallery': { count: 8, totalHoles: 400 }, 'p-gown-bench': { count: 3 }, 'p-gown-floor': { count: 65 },
      'p-drain': { count: 4 }, 'p-airlock2': { count: 1 }, 'p-corridor-b': { count: 1 }, 'p-glove-b': { count: 0 },
      'p-fill-floor': { count: 0 }, 'p-rabs-face': { count: 40, chainOfCustodyValid: false }, 'p-hepa': { count: 0, totalHoles: 400 }
    }),
    expectedPathIds: ['p-d-door', 'p-airlock1', 'p-gown-floor'], supportedCapaId: 'investigate-personnel-flow',
    capaRationale: 'ร่องรอยจากประตู ผ่าน airlock ไปห้อง gowning ต่อกันครบและไล่สูงขึ้น หลักฐานรองรับให้เปิดสอบสวนเรื่องการเดินของคนได้ ส่วนเพลต RABS นั้น ตราบใดที่ chain of custody ยังขาด ก็เอามาต่อเส้นทางหรือใช้อ้างสั่งหยุดไลน์ไม่ได้ ต้องเก็บตัวอย่างใหม่พร้อมบันทึกก่อน ถึงจะนับเป็นหลักฐาน',
    unsupportedNote: 'ตัวเลขจาก Grade A จะสูงแค่ไหน ก็รับน้ำหนักการสั่งหยุดไลน์ไม่ไหว ถ้าสายโยงกลับไปหาจุดเก็บตัวอย่างขาดไปแล้ว การดันเรื่องต่อจากตัวเลขนี้ เท่ากับเอาความผิดพลาดเรื่องป้ายมาใช้แทนผลทางชีวภาพ',
    principle: 'ถ้า chain of custody ขาด ผลนั้นก็หลุดออกจากกองหลักฐานไปเลย ตัวเลขจะดูหนักแค่ไหนก็ไม่เกี่ยว'
  }
];

export function excursionCaseById(id: string) {
  return EXCURSION_CASES.find((item) => item.id === id) || EXCURSION_CASES[0];
}

export function excursionCaseByNumber(number: number) {
  return EXCURSION_CASES.find((item) => item.number === number) || EXCURSION_CASES[0];
}
