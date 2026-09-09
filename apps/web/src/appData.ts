import { AirVent, Building2, ClipboardCheck, CircleHelp, Droplets, Gauge, MapPin, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Domain = 'water' | 'air' | 'cv';
export type WorkflowId = 'pw-prw' | 'wfi-pus' | 'compressed-air' | 'em-air' | 'cv';
export type BuildingGroupId = 'B10' | 'B12' | 'B16' | 'OTHER' | 'RESERVE';
export type BinderState = 'active' | 'disabled' | 'coming-soon';
export type PdfWorkflow =
  | 'pw-prw'
  | 'wfi-pus'
  | 'compressed-air'
  | 'em-air'
  | 'cleaning-validation-contact'
  | 'cleaning-validation-rinse-pour'
  | 'cleaning-validation-rinse-membrane';
export type PdfPolicy = 'all' | 'cv-method' | 'none';

export type Workflow = {
  id: WorkflowId;
  domain: Domain;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  iconId: string;
  pdfWorkflow: PdfWorkflow | null;
  pdfPolicy: PdfPolicy;
};

export const workflows: Workflow[] = [
  { id: 'pw-prw', domain: 'water', name: 'Purified Water / Process Raw Water', shortName: 'PRW & PW', description: 'Routine and qualification water worksheets', icon: Droplets, iconId: 'icon-water-prw-pw', pdfWorkflow: 'pw-prw', pdfPolicy: 'all' },
  { id: 'wfi-pus', domain: 'water', name: 'Water for Injection / Purified Utility System', shortName: 'WFI', description: 'Sterile utility water worksheets', icon: Droplets, iconId: 'icon-wfi', pdfWorkflow: 'wfi-pus', pdfPolicy: 'all' },
  { id: 'compressed-air', domain: 'air', name: 'Compressed Air', shortName: 'CA', description: 'Compressed-air microbiology monitoring', icon: Gauge, iconId: 'icon-compressed-air', pdfWorkflow: 'compressed-air', pdfPolicy: 'all' },
  { id: 'em-air', domain: 'air', name: 'Environmental Monitoring Air', shortName: 'Air Sampling', description: 'Environmental air monitoring', icon: Wind, iconId: 'icon-air-sampling', pdfWorkflow: 'em-air', pdfPolicy: 'all' },
  { id: 'cv', domain: 'cv', name: 'Cleaning Validation', shortName: 'Cleaning Validation', description: 'Contact Plate and rinse records', icon: ClipboardCheck, iconId: 'icon-cleaning-validation', pdfWorkflow: 'cleaning-validation-contact', pdfPolicy: 'cv-method' }
];

export const domains = [
  { id: 'water' as const, label: 'Water', detail: 'PW / PRW and WFI / PUS', icon: Droplets },
  { id: 'air' as const, label: 'Air', detail: 'Compressed Air and EM Air', icon: AirVent },
  { id: 'cv' as const, label: 'Cleaning Validation', detail: 'Contact Plate and rinse', icon: ClipboardCheck }
];

export type BuildingGroup = {
  id: BuildingGroupId;
  label: string;
  colorToken: string;
  softColorToken: string;
  assetId: string;
  icon: LucideIcon;
  order: number;
  active: boolean;
};

/* The printed spine of the physical box file, transcribed from the binders on
 * the ANF3 shelf. Four bands top to bottom: code, title, location, board.
 * Cleaning Validation carries no Thai line because no photographed label
 * exists for it — the app does not invent controlled-label wording. */
export type SpineLabel = {
  code: string;
  th: string[];
  en: string[];
  location: string;
};

/* A binder that holds more than one kind of record opens onto its own
 * contents page instead of straight into a record list — the orange Other
 * Locations file (Building 11 and Building 19 share one binder) and the
 * Cleaning Validation files (Contact Plate or Rinse, chosen inside). */
export type BinderSection = {
  id: string;
  label: string;
  detail: string;
  route: string;
};

export type BinderInstance = {
  id: string;
  groupId: BuildingGroupId;
  buildingFilter: string | null;
  workflowId: WorkflowId;
  label: string;
  iconId: string;
  secondaryFilter?: Record<string, string | string[]>;
  route: string | null;
  state: BinderState;
  order: number;
  spine: SpineLabel;
  sections?: BinderSection[];
};

export const buildingGroups: BuildingGroup[] = [
  { id: 'B10', label: 'Building 10', colorToken: '--binder-b10', softColorToken: '--binder-b10-soft', assetId: 'binder-blue-b10', icon: Building2, order: 1, active: true },
  { id: 'B12', label: 'Building 12', colorToken: '--binder-b12', softColorToken: '--binder-b12-soft', assetId: 'binder-violet-b12', icon: Building2, order: 2, active: true },
  { id: 'B16', label: 'Building 16', colorToken: '--binder-b16', softColorToken: '--binder-b16-soft', assetId: 'binder-mint-b16', icon: Building2, order: 3, active: true },
  { id: 'OTHER', label: 'Other Locations', colorToken: '--binder-other', softColorToken: '--binder-other-soft', assetId: 'binder-orange-other', icon: MapPin, order: 4, active: true },
  { id: 'RESERVE', label: 'Coming Soon', colorToken: '--binder-reserve', softColorToken: '--binder-reserve-soft', assetId: 'binder-pink-coming-soon', icon: CircleHelp, order: 5, active: false }
];

type BinderDefinition = Omit<BinderInstance, 'route' | 'spine'> & {
  spineLocation: string;
  spineCode?: string;
  spineSuffix?: string;
  /** Set when the binder is not one workflow — the spine is printed by hand. */
  spineOverride?: { th: string[]; en: string[] };
  /** Set when the binder opens onto a contents page rather than a record list. */
  ownRoute?: string;
};

const spineTitles: Record<WorkflowId, { th: string[]; en: string[] }> = {
  'pw-prw': {
    th: ['ผลการตรวจหาปริมาณ', 'เชื้อจุลินทรีย์ในตัวอย่างน้ำ'],
    en: ['Process Water (PRW)', 'and Purified Water (PW)']
  },
  'wfi-pus': {
    th: ['ผลการตรวจหาปริมาณ', 'เชื้อจุลินทรีย์ในตัวอย่างน้ำ'],
    en: ['WATER FOR INJECTION']
  },
  'em-air': {
    th: ['ผลการสุ่มตัวอย่าง', 'และตรวจหาปริมาณ', 'เชื้อจุลินทรีย์ในอากาศ'],
    en: ['PASSIVE AND', 'ACTIVE AIR SAMPLER']
  },
  'compressed-air': {
    th: ['ผลการสุ่มตัวอย่าง', 'และตรวจหาปริมาณ', 'เชื้อจุลินทรีย์ในอากาศ'],
    en: ['COMPRESSED AIR SAMPLING']
  },
  cv: {
    th: [],
    en: ['CONTACT PLATE', 'AND RINSE RECORDS']
  }
};

function spineFor(definition: BinderDefinition): SpineLabel {
  const title = definition.spineOverride || spineTitles[definition.workflowId];
  const code = (definition.spineCode || definition.label).toUpperCase();
  return {
    code,
    th: title.th,
    en: definition.spineSuffix ? [...title.en, definition.spineSuffix] : title.en,
    location: definition.spineLocation
  };
}
const binderDefinitions: BinderDefinition[] = [
  { id: 'b10-pw-prw', groupId: 'B10', buildingFilter: 'Building 10', workflowId: 'pw-prw', label: 'PRW & PW', iconId: 'icon-water-prw-pw', secondaryFilter: { waterType: 'all' }, state: 'active', spineLocation: 'BUILDING 10', order: 1 },
  { id: 'b10-em-air', groupId: 'B10', buildingFilter: 'Building 10', workflowId: 'em-air', label: 'Air Sampling', iconId: 'icon-air-sampling', secondaryFilter: { samplingMode: ['passive', 'active'] }, state: 'active', spineLocation: 'BUILDING 10', order: 2 },
  { id: 'b10-ca', groupId: 'B10', buildingFilter: 'Building 10', workflowId: 'compressed-air', label: 'CA', iconId: 'icon-compressed-air', secondaryFilter: { gasType: 'CA' }, state: 'active', spineLocation: 'BUILDING 10', order: 3 },
  { id: 'b10-cv', groupId: 'B10', buildingFilter: 'Building 10', workflowId: 'cv', label: 'Cleaning Validation', iconId: 'icon-cleaning-validation', secondaryFilter: { samplingFamily: 'all' }, state: 'active', spineLocation: 'BUILDING 10', order: 4 },
  { id: 'b12-pw-prw', groupId: 'B12', buildingFilter: 'Building 12', workflowId: 'pw-prw', label: 'PRW & PW', iconId: 'icon-water-prw-pw', secondaryFilter: { waterType: 'all' }, state: 'active', spineLocation: 'BUILDING 12', order: 1 },
  { id: 'b12-em-air', groupId: 'B12', buildingFilter: 'Building 12', workflowId: 'em-air', label: 'Air Sampling', iconId: 'icon-air-sampling', secondaryFilter: { samplingMode: ['passive', 'active'] }, state: 'active', spineLocation: 'BUILDING 12', order: 2 },
  { id: 'b12-ca', groupId: 'B12', buildingFilter: 'Building 12', workflowId: 'compressed-air', label: 'CA', iconId: 'icon-compressed-air', secondaryFilter: { gasType: 'CA' }, state: 'active', spineLocation: 'BUILDING 12', order: 3 },
  { id: 'b12-cv', groupId: 'B12', buildingFilter: 'Building 12', workflowId: 'cv', label: 'Cleaning Validation', iconId: 'icon-cleaning-validation', secondaryFilter: { samplingFamily: 'all' }, state: 'active', spineLocation: 'BUILDING 12', order: 4 },
  { id: 'b16-pw-prw', groupId: 'B16', buildingFilter: 'Building 16', workflowId: 'pw-prw', label: 'PRW & PW', iconId: 'icon-water-prw-pw', secondaryFilter: { waterType: 'all' }, state: 'active', spineLocation: 'OCL BUILDING 16', order: 1 },
  { id: 'b16-wfi', groupId: 'B16', buildingFilter: 'Building 16', workflowId: 'wfi-pus', label: 'WFI', iconId: 'icon-wfi', secondaryFilter: { waterType: 'WFI/PUS' }, state: 'active', spineLocation: 'BUILDING 16', order: 2 },
  { id: 'b16-em-air', groupId: 'B16', buildingFilter: 'Building 16', workflowId: 'em-air', label: 'Air Sampling', iconId: 'icon-air-sampling', secondaryFilter: { samplingMode: ['passive', 'active'] }, state: 'active', spineLocation: 'BUILDING 16', order: 3 },
  { id: 'b16-ca-n2', groupId: 'B16', buildingFilter: 'Building 16', workflowId: 'compressed-air', label: 'CA & Nitrogen', iconId: 'icon-compressed-air', secondaryFilter: { gasType: ['CA', 'N2'] }, state: 'active', spineLocation: 'OCL BUILDING 16', spineSuffix: 'AND NITROGEN', order: 4 },
  { id: 'b16-cv', groupId: 'B16', buildingFilter: 'Building 16', workflowId: 'cv', label: 'Cleaning Validation', iconId: 'icon-cleaning-validation', secondaryFilter: { samplingFamily: 'all' }, state: 'active', spineLocation: 'BUILDING 16', order: 5 },
  { id: 'other-locations', groupId: 'OTHER', buildingFilter: null, workflowId: 'em-air', label: 'Other Locations', iconId: 'icon-other-locations', state: 'active', spineLocation: 'BUILDING 11 & 19', spineCode: 'OTHER LOCATIONS', spineOverride: { th: [], en: ['AIR SAMPLING, CA', 'AND PRW RECORDS'] }, ownRoute: '/binder/other-locations', order: 1 },
  { id: 'reserve-spare', groupId: 'RESERVE', buildingFilter: null, workflowId: 'em-air', label: 'Coming Soon', iconId: 'icon-coming-soon', state: 'coming-soon', spineLocation: '', spineCode: 'COMING SOON', spineOverride: { th: [], en: [] }, order: 1 }
];

/* What is inside the orange binder. Building 11 and Building 19 share one
 * physical file on the shelf, so they share one binder here. */
export const otherLocationSections: BinderSection[] = [
  { id: 'b11-em-air', label: 'Building 11 · Air Sampling', detail: 'Passive and active air sampler', route: '/records/air/em-air?building=Building%2011&samplingMode=passive,active' },
  { id: 'b11-ca', label: 'Building 11 · Compressed Air', detail: 'Compressed air sampling', route: '/records/air/compressed-air?building=Building%2011&gasType=CA' },
  { id: 'b19-prw', label: 'Building 19 · PRW', detail: 'Process raw water', route: '/records/water/pw-prw?building=Building%2019&waterType=PRW' }
];

function binderRoute(definition: BinderDefinition) {
  if (definition.state !== 'active') return null;
  if (definition.ownRoute) return definition.ownRoute;
  const workflow = workflows.find((candidate) => candidate.id === definition.workflowId);
  if (!workflow) return null;
  const params = new URLSearchParams();
  if (definition.buildingFilter) params.set('building', definition.buildingFilter);
  Object.entries(definition.secondaryFilter || {}).forEach(([key, value]) => {
    if (value === 'all') return;
    params.set(key, Array.isArray(value) ? value.join(',') : value);
  });
  const query = params.toString();
  return `/records/${workflow.domain}/${workflow.id}${query ? `?${query}` : ''}`;
}

export const binderInstances: BinderInstance[] = binderDefinitions.map((definition) => ({
  ...definition,
  route: binderRoute(definition),
  spine: spineFor(definition),
  sections: definition.id === 'other-locations' ? otherLocationSections : undefined
}));

/** Binders standing on the shelf, including the reserve file, which is on the
 *  shelf and labelled but has no route behind it. */
export function shelfBinders(groupId: BuildingGroupId) {
  return binderInstances
    .filter((binder) => binder.groupId === groupId && binder.state !== 'disabled')
    .sort((a, b) => a.order - b.order);
}

/** Binders you can actually open. */
export function activeBinders(groupId: BuildingGroupId) {
  return binderInstances
    .filter((binder) => binder.groupId === groupId && binder.state === 'active')
    .sort((a, b) => a.order - b.order);
}


/** Which binder a record route came out of, so the page can be framed as the
 *  inside of that binder — and so a deep link is framed the same way as a
 *  click on the shelf. Building 11 and Building 19 resolve to the one orange
 *  binder they share. */
export function binderForContext(workflowId?: string, building?: string | null) {
  /* A bare workflow route — /records/water/pw-prw with no building — is not a
     binder. It is the workflow across every building, and framing it as one
     particular file would be a lie. */
  if (!workflowId || !building) return undefined;
  const direct = binderInstances.find((binder) =>
    binder.state === 'active'
    && binder.workflowId === workflowId
    && binder.buildingFilter === building);
  if (direct) return direct;
  const shared = binderInstances.find((binder) =>
    binder.state === 'active'
    && binder.sections?.some((section) => section.route.includes(`/${workflowId}?`)
      && (!building || section.route.includes(encodeURIComponent(building)))));
  return shared;
}

export function binderById(id?: string) {
  return binderInstances.find((binder) => binder.id === id);
}


export const calendarId = 'b10fd3d3d7aad45825b8f583a238de14e8568db71dd085f91e2f7f88d24aa7d3@group.calendar.google.com';

export type Tool = {
  label: string;
  detail: string;
  href: string;
  /** Reachable only from inside the laboratory network; checked before opening. */
  network?: 'ANF3';
};

export const tools: Tool[] = [
  { label: 'Stock DB', detail: 'Lab_Stock Google Sheet', href: 'https://docs.google.com/spreadsheets/d/1TO71FHcJr9G4eYP--UCIl-a7691aO_JD7ROLwf0rUFk/edit?usp=drivesdk' },
  { label: 'Stock Web', detail: 'Lab Stock web app', href: 'https://script.google.com/macros/s/AKfycbyj2tJTRSsQ0wKu0oFDoohdFcZxbljPdnITdHJsv8MZx1X9_3KZ3AvFuvWl8oLc5E6n/exec' },
  { label: 'จองเลขเอกสาร', detail: 'Log Documents — reserve a controlled number', href: 'https://docs.google.com/spreadsheets/d/15Vp8BSoIyD1XPwoiDoCfrFRf6689RvPVDxllsaK1pvE/edit?usp=drivesdk' },
  { label: 'Upload Picture', detail: 'Laboratory Google Drive folder', href: 'https://drive.google.com/drive/folders/1ee7LRvItfyxSZzd-Q-yVXdDGrdT5co9o?usp=sharing' },
  { label: 'COA App', detail: 'On the ANF3 network only', href: 'http://192.168.1.10:8000', network: 'ANF3' }
];


export function fellerCorrected(positiveHoles: number, totalHoles = 400) {
  let sum = 0;
  for (let index = 0; index < positiveHoles; index += 1) sum += totalHoles / (totalHoles - index);
  return Math.round(sum);
}

export function workflowById(id?: string) {
  return workflows.find((workflow) => workflow.id === id);
}
