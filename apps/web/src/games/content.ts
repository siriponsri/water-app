import type {
  BacterialCase, CultureObservation, Hypothesis, MediaId, StoredGameProfile
} from './types';

export type MediaDefinition = {
  id: MediaId;
  name: string;
  form: 'broth' | 'agar';
  role: string;
  boundary: string;
};

export const EDUCATIONAL_PROFILE: StoredGameProfile = {
  id: 'anf3-educational-demo-2026-09',
  displayName: 'ANF3 educational demonstration profile',
  effectiveDate: '2026-09-01',
  educationalOnly: true,
  disclaimer: 'เป็นการจำลองเพื่อฝึกอบรมเท่านั้น ให้ยึดตำรับฉบับปัจจุบัน ขั้นตอนปฏิบัติที่อนุมัติแล้ว และการกำกับดูแลจากผู้มีคุณสมบัติเป็นหลัก',
  media: [
    { id: 'TSB', name: 'Tryptic Soy Broth', form: 'broth', role: 'เลี้ยงเชื้อแบบกว้างและดูการเจริญ', boundary: 'ความขุ่นบอกไม่ได้ว่าเป็นเชื้ออะไร' },
    { id: 'SDA', name: 'Sabouraud Dextrose Agar', form: 'agar', role: 'เชื้อราขึ้น และเบาะแสจากลักษณะโคโลนี', boundary: 'ยังระบุชนิดเชื้อราแบบยืนยันไม่ได้' },
    { id: 'MSA', name: 'Mannitol Salt Agar', form: 'agar', role: 'เพลตที่เป็นทั้ง selective และ differential', boundary: 'สีเหลืองเป็นแค่หลักฐานเบื้องต้น ยังสรุปไม่ได้' },
    { id: 'MAC', name: 'MacConkey Agar', form: 'agar', role: 'เพลตที่เป็นทั้ง selective และ differential', boundary: 'สีโคโลนีพิสูจน์สปีชีส์ไม่ได้' },
    { id: 'RV', name: 'Rappaport-Vassiliadis Medium', form: 'broth', role: 'broth เพิ่มจำนวนเชื้อแบบ selective', boundary: 'ต้องอ่านร่วมกับการ plate ขั้นถัดไปที่เชื่อมกันอยู่' },
    { id: 'XLD', name: 'Xylose Lysine Deoxycholate Agar', form: 'agar', role: 'เพลตที่เป็นทั้ง selective และ differential', boundary: 'ต่อให้รูปแบบตรงตำรา ก็ยังเป็นแค่ผลสันนิษฐาน' }
  ]
};

export const MEDIA_BY_ID = Object.fromEntries(
  EDUCATIONAL_PROFILE.media.map((medium) => [medium.id, medium])
) as Record<MediaId, MediaDefinition>;



export const HYPOTHESES: Hypothesis[] = [
  { id: 'staph-aureus-like', label: 'S. aureus-like', maximum: 'เชื้อที่สันนิษฐานว่าทนเกลือ mannitol เป็นบวก แบบ Staphylococcus', increasesWith: 'MSA มีเชื้อขึ้นและเปลี่ยนเป็นสีเหลือง', weakensWith: 'MAC ขึ้นเชื้อพอใช้ได้ หรือขึ้นหลายลักษณะปนกัน', confounder: 'ปฏิกิริยาเบื้องต้นไม่ใช่การยืนยันสปีชีส์' },
  { id: 'cons-like', label: 'CoNS-like', maximum: 'เชื้อที่สันนิษฐานว่าทนเกลือ mannitol เป็นลบ แบบ Staphylococcus', increasesWith: 'MSA มีเชื้อขึ้นแต่สีไม่เปลี่ยน', weakensWith: 'ปฏิกิริยา mannitol เป็นบวกชัดเจน', confounder: 'ปฏิกิริยาที่ไม่คงที่ ต้องยืนยันตามขั้นตอนที่อนุมัติแล้ว' },
  { id: 'lactose-fermenter', label: 'แกรมลบที่หมัก lactose', maximum: 'กลุ่มที่สันนิษฐานว่าเป็นแกรมลบหมัก lactose / เข้าได้กับเชื้อลำไส้', increasesWith: 'โคโลนีสีชมพู/แดงบน MAC', weakensWith: 'MAC ไม่ขึ้นเชื้อที่ใช้ได้ และ MSA ก็ไม่มีรูปแบบชัด', confounder: 'โคโลนีสีชมพู/แดงไม่ได้บอกนามสกุลของเชื้อ' },
  { id: 'salmonella-like', label: 'Salmonella-like', maximum: 'รูปแบบเบื้องต้นเข้าได้กับ Salmonella-like ต้องยืนยันต่อ', increasesWith: 'RV enrichment ใช้ได้ ตามด้วยโคโลนีจุดดำบน XLD', weakensWith: 'MAC ขึ้นสีชมพู หรือ XLD ที่ไม่ได้ผ่านลำดับที่กำหนดไว้', confounder: 'ดู XLD อย่างเดียวยังสรุปไม่ได้' },
  { id: 'shigella-like', label: 'Shigella-like / เชื้อลำไส้ที่ไม่สร้าง H2S', maximum: 'รูปแบบเบื้องต้น เข้าได้กับเชื้อลำไส้ที่ไม่หมัก lactose', increasesWith: 'MAC ซีด และ XLD แดง/ชมพูแต่ไม่มีจุดดำ', weakensWith: 'รูปแบบ XLD ที่มีจุดดำตรงกลาง', confounder: 'อาหารที่มีอยู่แยกถึงระดับสปีชีส์ไม่ได้' },
  { id: 'yeast-like', label: 'เชื้อขึ้นแบบยีสต์', maximum: 'สงสัยว่าไม่ใช่แบคทีเรีย หรือขึ้นแบบยีสต์', increasesWith: 'บน SDA ขึ้นสีครีม ลักษณะแบบยีสต์', weakensWith: 'เพลตแบคทีเรียให้รูปแบบเดียว สอดคล้องกัน', confounder: 'ลักษณะโคโลนีบน SDA ไม่ใช่การยืนยันชนิดเชื้อรา' },
  { id: 'mold-like', label: 'เชื้อขึ้นแบบรา', maximum: 'สงสัยว่าไม่ใช่แบคทีเรีย หรือขึ้นแบบรา', increasesWith: 'บน SDA ขึ้นเป็นเส้นใยหรือแผ่รัศมี', weakensWith: 'SDA ไม่ขึ้นเชื้อ', confounder: 'ต้องทำงานเพิ่มตามขั้นตอนที่อนุมัติแล้ว' },
  { id: 'mixed', label: 'เชื้อปนกัน', maximum: 'สงสัยว่าเชื้อปนหรือความบริสุทธิ์มีปัญหา', increasesWith: 'ตัวอย่างเดียวแต่มีสอง morphotype', weakensWith: 'หลักฐานที่เชื่อมกัน ให้ morphotype เดียวสอดคล้องกันหมด', confounder: 'อย่าเอาสองรูปแบบมาเฉลี่ยเป็นเชื้อตัวเดียว' }
];

const culture = (medium: MediaId, form: 'broth' | 'agar', growth: CultureObservation['growth'], abundance: CultureObservation['abundance'], reaction: CultureObservation['reaction'], morphotypes: 0 | 1 | 2, confidence: CultureObservation['confidence'], brothState?: CultureObservation['brothState']): CultureObservation => ({ medium, growth, abundance, reaction, morphotypes, confidence, brothState, ...(form === 'broth' ? { brothState: brothState || (growth === 'present' ? 'turbid' : growth === 'equivocal' ? 'equivocal' : 'clear') } : {}) });

const case0: BacterialCase = {
  id: 'case-0-media-room', number: 0, title: 'Case 00 - แนะนำห้อง media', shortTitle: 'แนะนำห้อง media', seed: 'SIXTH-PLATE-0000',
  sample: 'ขวดและเพลตติดป้ายหกใบในคลังฝึกอบรมสมมติ', briefing: 'ก่อนเปิดเคส ต้องรู้ก่อนว่าอันไหนเป็น broth อันไหนเป็นเพลต และแต่ละอันให้หลักฐานแบบไหนได้บ้าง', question: 'อาหารแต่ละขวดทำหน้าที่อะไร', availableMedia: ['TSB', 'SDA', 'MSA', 'MAC', 'RV', 'XLD'], actionBudget: 0, requiredSequence: [], hypotheses: [], truth: {}, expectedConclusion: 'cannot_resolve', supportedNextAction: 'ดูคำอธิบายบทบาทของอาหารเลี้ยงเชื้อ', maximumClaim: 'ไม่ระบุชนิดเชื้อ', chainOfCustodyValid: true, mixedCulture: false, defects: [], principle: 'อาหารเลี้ยงเชื้อเป็นรูปแบบไหนและทำหน้าที่อะไร เป็นตัวกำหนดขอบเขตของหลักฐาน ต้องรู้ก่อนจะไปอ่านปฏิกิริยา'
};

const case1: BacterialCase = {
  id: 'case-1-yellow-bench', number: 1, title: 'Case 01 - เชื้อสีเหลืองจากโต๊ะแล็บ', shortTitle: 'เชื้อสีเหลืองจากโต๊ะแล็บ', seed: 'SIXTH-PLATE-1042',
  sample: 'ช่องส่งของสแตนเลสที่คนจับบ่อย Zone C สมมติ', briefing: 'เชื้อสีครีมที่ขึ้นมาโยงกับหลอด TSB ที่ขุ่น หัวหน้าต้องการข้อสรุปที่แคบที่สุดเท่าที่ยันได้ ไม่ใช่ชื่อสปีชีส์ที่คุ้นหู', question: 'หลักฐานจากการเพาะเชื้อที่มีอยู่ รองรับข้อสรุปได้ละเอียดถึงระดับไหน', availableMedia: ['TSB', 'MSA', 'MAC'], actionBudget: 3, requiredSequence: [], hypotheses: ['staph-aureus-like', 'cons-like', 'lactose-fermenter'], truth: {
    TSB: culture('TSB', 'broth', 'present', 'heavy', 'not_applicable', 1, 'high', 'turbid'), MSA: culture('MSA', 'agar', 'present', 'moderate', 'yellowing', 1, 'high'), MAC: culture('MAC', 'agar', 'none_visible', 'not_applicable', 'not_applicable', 0, 'high')
  }, expectedConclusion: 'presumptive_staph_like', supportedNextAction: 'confirm-approved', maximumClaim: 'เชื้อที่สันนิษฐานว่าทนเกลือ mannitol เป็นบวก แบบ Staphylococcus', chainOfCustodyValid: true, mixedCulture: false, defects: [], principle: 'อาหาร selective และ differential ช่วยแคบสมมติฐานลง แต่ตัวมันเองพิสูจน์สปีชีส์ไม่ได้'
};

const case2: BacterialCase = {
  id: 'case-2-pink-not-surname', number: 2, title: 'Case 02 - สีชมพูไม่ใช่นามสกุลเชื้อ', shortTitle: 'สีชมพูไม่ใช่นามสกุลเชื้อ', seed: 'SIXTH-PLATE-2051', sample: 'จุดเก็บวัตถุดิบสมมติ Zone A', briefing: 'เชื้อขึ้นใน TSB แล้วต่อด้วยโคโลนีสีชมพู/แดงบน MAC ยังเป็นเชื้อหมัก lactose ได้อีกหลายตัว', question: 'สรุปได้ถึงระดับกลุ่มแค่ไหน โดยไม่เลยเถิดไปถึงสปีชีส์', availableMedia: ['TSB', 'MAC', 'XLD'], actionBudget: 3, requiredSequence: ['MAC'], hypotheses: ['lactose-fermenter', 'staph-aureus-like', 'mixed'], truth: { TSB: culture('TSB', 'broth', 'present', 'heavy', 'not_applicable', 1, 'high', 'turbid'), MAC: culture('MAC', 'agar', 'present', 'moderate', 'pink_red', 1, 'high'), XLD: culture('XLD', 'agar', 'present', 'sparse', 'yellowing', 1, 'moderate') }, expectedConclusion: 'presumptive_lactose_fermenter', supportedNextAction: 'confirm-approved', maximumClaim: 'เชื้อที่สันนิษฐานว่าเป็นแกรมลบหมัก lactose / เข้าได้กับกลุ่มลำไส้', chainOfCustodyValid: true, mixedCulture: false, defects: [], principle: 'ผล lactose บวกช่วยแคบกลุ่มลง แต่ไม่ได้บอกนามสกุลของเชื้อ'
};

const case3: BacterialCase = {
  id: 'case-3-black-center', number: 3, title: 'Case 03 - จุดดำตรงกลาง', shortTitle: 'จุดดำตรงกลาง', seed: 'SIXTH-PLATE-3074', sample: 'ตัวอย่างสมมติจากผิวสัมผัสผลิตภัณฑ์ รอคัดกรองเชื้อลำไส้', briefing: 'โคโลนีซีดบน MAC กับ XLD ที่ streak ตรงแล้วอ่านไม่ชัด ทำให้ลำดับ enrichment สำคัญขึ้นมา RV เป็นขั้นตอน broth ไม่ใช่เพลตสำหรับระบุเชื้อ', question: 'ลำดับ RV ไป XLD ที่เชื่อมกัน รองรับสมมติฐานเชื้อลำไส้แบบมีขอบเขตได้ไหม', availableMedia: ['TSB', 'MAC', 'RV', 'XLD'], actionBudget: 4, requiredSequence: ['RV', 'XLD'], hypotheses: ['salmonella-like', 'shigella-like', 'lactose-fermenter'], truth: { TSB: culture('TSB', 'broth', 'present', 'heavy', 'not_applicable', 1, 'high', 'turbid'), MAC: culture('MAC', 'agar', 'present', 'sparse', 'pale_colorless', 1, 'moderate'), RV: culture('RV', 'broth', 'present', 'moderate', 'not_applicable', 1, 'high', 'turbid'), XLD: culture('XLD', 'agar', 'present', 'moderate', 'black_center', 1, 'high') }, expectedConclusion: 'presumptive_salmonella_like', supportedNextAction: 'confirm-approved', maximumClaim: 'รูปแบบเบื้องต้นเข้าได้กับ Salmonella-like ต้องยืนยันต่อ', chainOfCustodyValid: true, mixedCulture: false, defects: [], principle: 'XLD ที่มีจุดดำจะมีความหมาย ก็ต่อเมื่อมีลำดับ enrichment ที่ใช้ได้และเชื่อมกันอยู่ แต่ก็ยังเป็นแค่ผลสันนิษฐาน'
};

const case4: BacterialCase = {
  id: 'case-4-red-without-black', number: 4, title: 'Case 04 - แดงแต่ไม่มีจุดดำ', shortTitle: 'แดงแต่ไม่มีจุดดำ', seed: 'SIXTH-PLATE-4092', sample: 'ตัวอย่างสอบสวนสมมติ ชนิดที่ไม่หมัก lactose', briefing: 'MAC ขึ้นโคโลนีซีด XLD ขึ้นแดง/ชมพูแต่ไม่มีจุดดำ รูปแบบนี้บอกอะไรได้อยู่ แต่ยังไม่เจาะจงพอจะสรุปเป็นสปีชีส์', question: 'รูปแบบเชื้อไม่หมัก lactose ที่ยังสรุปไม่ได้ ควรรายงานยังไง', availableMedia: ['TSB', 'MAC', 'XLD'], actionBudget: 3, requiredSequence: ['XLD'], hypotheses: ['shigella-like', 'salmonella-like', 'mixed'], truth: { TSB: culture('TSB', 'broth', 'present', 'moderate', 'not_applicable', 1, 'high', 'turbid'), MAC: culture('MAC', 'agar', 'present', 'sparse', 'pale_colorless', 1, 'moderate'), XLD: culture('XLD', 'agar', 'present', 'moderate', 'red_pink', 1, 'high') }, expectedConclusion: 'presumptive_non_lactose_enteric', supportedNextAction: 'confirm-approved', maximumClaim: 'เชื้อที่สันนิษฐานว่าเป็นกลุ่มลำไส้ที่ไม่หมัก lactose', chainOfCustodyValid: true, mixedCulture: false, defects: ['insufficient_species_resolution'], principle: 'รูปแบบที่บอกอะไรได้เยอะ ก็ยังต้องรายงานแบบกว้างไว้ก่อน และต้องยืนยันตามขั้นตอนที่อนุมัติแล้ว'
};

const case5: BacterialCase = {
  id: 'case-5-colony-not-here', number: 5, title: 'Case 05 - โคโลนีที่ไม่ควรมาอยู่ตรงนี้', shortTitle: 'โคโลนีที่ไม่ควรมาอยู่ตรงนี้', seed: 'SIXTH-PLATE-5016', sample: 'จุดเก็บน้ำล้างสมมติที่พบเชื้อขึ้นแบบไม่คาดคิด', briefing: 'TSB ขุ่น เพลต selective ของแบคทีเรียให้ผลไม่สอดคล้องกัน ส่วน SDA ขึ้นลักษณะที่ไม่ใช่แบคทีเรียชัดเจน', question: 'ถ้าลักษณะเชื้อราคือเบาะแสที่แน่นที่สุด ต้องเปิดอะไรค้างไว้บ้าง', availableMedia: ['TSB', 'SDA', 'MAC'], actionBudget: 3, requiredSequence: ['SDA'], hypotheses: ['yeast-like', 'mold-like', 'staph-aureus-like', 'mixed'], truth: { TSB: culture('TSB', 'broth', 'present', 'moderate', 'not_applicable', 1, 'high', 'turbid'), SDA: culture('SDA', 'agar', 'present', 'moderate', 'yeast_cream', 1, 'high'), MAC: culture('MAC', 'agar', 'none_visible', 'not_applicable', 'not_applicable', 0, 'high') }, expectedConclusion: 'non_bacterial_suspected', supportedNextAction: 'qa-escalation', maximumClaim: 'สงสัยว่าไม่ใช่แบคทีเรีย หรือขึ้นแบบยีสต์', chainOfCustodyValid: true, mixedCulture: false, defects: ['non_bacterial_morphology'], principle: 'ชื่อเคสเขียนว่าแบคทีเรีย ไม่ได้แปลว่าทุกอย่างที่ขึ้นมาเป็นแบคทีเรีย ให้ดูตามลักษณะที่เห็นชัดที่สุด'
};

const case6: BacterialCase = {
  id: 'case-6-two-answers', number: 6, title: 'Case 06 - หนึ่งเพลตมีสองคำตอบ', shortTitle: 'หนึ่งเพลตมีสองคำตอบ', seed: 'SIXTH-PLATE-6128', sample: 'swab สิ่งแวดล้อมสมมติ ที่บนกระดาษบอกว่าเชื้อบริสุทธิ์', briefing: 'บน MAC มีทั้ง morphotype สีชมพู/แดง และแบบซีด/ไม่มีสี กระดานหลักฐานต้องคงสองเส้นนี้ไว้ให้เห็น', question: 'ถ้าขึ้นสอง morphotype ข้อสรุปที่ว่าเป็นเชื้อตัวเดียวจะเป็นยังไง', availableMedia: ['TSB', 'MAC', 'XLD'], actionBudget: 3, requiredSequence: ['MAC'], hypotheses: ['lactose-fermenter', 'salmonella-like', 'mixed'], truth: { TSB: culture('TSB', 'broth', 'present', 'heavy', 'not_applicable', 1, 'high', 'turbid'), MAC: culture('MAC', 'agar', 'present', 'moderate', 'pink_red', 2, 'high'), XLD: culture('XLD', 'agar', 'present', 'sparse', 'pale_colorless', 2, 'moderate') }, expectedConclusion: 'mixed_culture', supportedNextAction: 'separate-mixed', maximumClaim: 'สงสัยว่าเชื้อปนหรือความบริสุทธิ์มีปัญหา', chainOfCustodyValid: true, mixedCulture: true, defects: ['mixed_morphotypes'] , principle: 'สอง morphotype คือหลักฐานสองเส้น ไม่ใช่เอามาเฉลี่ยกัน ต้องเคลียร์เรื่องความบริสุทธิ์ก่อน ถึงจะสรุปว่าเป็นเชื้อตัวเดียวได้'
};

const case7: BacterialCase = {
  id: 'case-7-wrong-tube', number: 7, title: 'Case 07 - หลอดผิด', shortTitle: 'หลอดผิด', seed: 'SIXTH-PLATE-7047', sample: 'ตัวอย่างสมมติจากผิวสัมผัสผลิตภัณฑ์ ที่ให้รูปแบบเชื้อลำไส้ดูน่าเชื่อ', briefing: 'ลำดับ RV ไป XLD ดูน่าเชื่อมาก จนไปดูไทม์ไลน์ chain of custody แล้วเจอว่าป้ายหลอดสลับกัน', question: 'หลักฐานทางชีวภาพที่แน่นหนา ซ่อมสายโยงตัวตนที่ขาดไปได้ไหม', availableMedia: ['TSB', 'RV', 'XLD'], actionBudget: 3, requiredSequence: ['RV', 'XLD'], hypotheses: ['salmonella-like', 'shigella-like', 'cannot-resolve'], truth: { TSB: culture('TSB', 'broth', 'present', 'moderate', 'not_applicable', 1, 'high', 'turbid'), RV: culture('RV', 'broth', 'present', 'moderate', 'not_applicable', 1, 'high', 'turbid'), XLD: culture('XLD', 'agar', 'present', 'moderate', 'black_center', 1, 'high') }, expectedConclusion: 'cannot_resolve', supportedNextAction: 'resolve-chain', maximumClaim: 'สายโยงตัวตนใช้ไม่ได้ ต้องสอบสวนและทำซ้ำตามขั้นตอน', chainOfCustodyValid: false, mixedCulture: false, defects: ['chain_of_custody_swap'], principle: 'ต่อให้หลักฐานทางชีวภาพแน่นแค่ไหน ก็ซ่อม traceability ที่ขาดไม่ได้'
};

const case8: BacterialCase = {
  id: 'case-8-atypical-capstone', number: 8, title: 'Case 08 - โจทย์รวบยอดที่ผลไม่ปกติ', shortTitle: 'โจทย์รวบยอดที่ผลไม่ปกติ', seed: 'SIXTH-PLATE-8165', sample: 'ตัวอย่างวัตถุดิบสมมติที่ให้ปฏิกิริยาขัดกันเอง', briefing: 'มีปฏิกิริยาหนึ่งที่ออกมาไม่ปกติ คนที่ทำถูกจะเห็นความขัดแย้งนี้ ขยายข้อสรุปให้กว้างขึ้น แล้วขอให้ยืนยันตามขั้นตอนที่อนุมัติแล้ว', question: 'จะรายงานผลที่ใช้งานได้ยังไง โดยไม่เดาไปถึงคำตอบที่ยังไม่เห็น', availableMedia: ['TSB', 'MAC', 'XLD', 'MSA'], actionBudget: 4, requiredSequence: ['MAC', 'XLD'], hypotheses: ['salmonella-like', 'lactose-fermenter', 'shigella-like', 'mixed'], truth: { TSB: culture('TSB', 'broth', 'present', 'moderate', 'not_applicable', 1, 'high', 'turbid'), MAC: culture('MAC', 'agar', 'present', 'moderate', 'pale_colorless', 1, 'high'), XLD: culture('XLD', 'agar', 'present', 'moderate', 'atypical', 1, 'moderate'), MSA: culture('MSA', 'agar', 'none_visible', 'not_applicable', 'not_applicable', 0, 'high') }, expectedConclusion: 'cannot_resolve', supportedNextAction: 'qa-escalation', maximumClaim: 'รูปแบบไม่ปกติแต่เข้าได้กับเชื้อลำไส้ อาหารที่มีอยู่แยกถึงสปีชีส์ไม่ได้', chainOfCustodyValid: true, mixedCulture: false, defects: ['atypical_reaction'], principle: 'หลักฐานที่ไม่ปกติทำให้มั่นใจได้น้อยลง สรุปแบบมีขอบเขตแล้วบอกว่ายังไม่จบ ดีกว่าเดาแบบมั่นใจ'
};

export const BACTERIAL_CASES: BacterialCase[] = [case0, case1, case2, case3, case4, case5, case6, case7, case8];
export const BACTERIAL_CASE = case1 as BacterialCase & { truth: Record<'TSB' | 'MSA' | 'MAC', CultureObservation> };

export const MEDIA_ORIENTATION: Array<{ id: MediaId; expected: string }> = [
  { id: 'TSB', expected: 'broth เลี้ยงเชื้อแบบกว้าง' }, { id: 'SDA', expected: 'เพลตสำหรับดูเชื้อรา' }, { id: 'MSA', expected: 'เพลต selective/differential' },
  { id: 'MAC', expected: 'เพลต selective/differential' }, { id: 'RV', expected: 'broth เพิ่มจำนวนเชื้อแบบ selective' }, { id: 'XLD', expected: 'เพลต selective/differential' }
];

export const PROFILE_VALID = EDUCATIONAL_PROFILE.educationalOnly === true
  && EDUCATIONAL_PROFILE.media.length === 6
  && new Set(EDUCATIONAL_PROFILE.media.map((medium) => medium.id)).size === 6;

