import type { Workflow } from './appData';
import { buildingFilterSegment, buildingLabel } from './recordScope';
import type { SearchItem } from './storage';

export type ListWorkKey = string;
export type ListGroup = {
  key: ListWorkKey;
  building: string;
  buildingSegment: string;
  label: string;
  workflowId: Workflow['id'];
  pdfWorkflow?: string;
  cvMethod?: string;
  items: SearchItem[];
};

function token(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/[\s_.-]+/g, '');
}

function cvMethod(item: SearchItem) {
  const value = token(item.testMethod);
  if (value.includes('MEMBRANEFILTRATION') || value === 'MEMBRANE' || value === 'MEMBFILTRATION') return 'membrane-filtration';
  if (value.includes('POURPLATE') || value === 'POUR') return 'pour-plate';
  return '';
}

function describe(workflow: Workflow, item: SearchItem) {
  if (workflow.id === 'pw-prw') return { label: 'PRW & PW', key: 'pw-prw' };
  if (workflow.id === 'wfi-pus') return { label: 'WFI / PUS', key: 'wfi-pus' };
  if (workflow.id === 'em-air') return { label: 'Air Sampling', key: 'em-air' };
  if (workflow.id === 'compressed-air') {
    const types = (item.sampleTypes || []).map(token);
    const nitrogen = types.includes('N2') || types.includes('NITROGEN');
    return nitrogen ? { label: 'CA & Nitrogen', key: 'compressed-air:n2' } : { label: 'Compressed Air', key: 'compressed-air:ca' };
  }

  const matrix = token(item.sampleMatrix);
  if (matrix.includes('CONTACTPLATE') || matrix === 'CONTACT') return { label: 'Contact Plate', key: 'cv:contact', cvMethod: 'contact-plate' };
  const method = cvMethod(item);
  if (method === 'pour-plate') return { label: 'Rinse · Pour Plate', key: 'cv:rinse:pour', cvMethod: method };
  if (method === 'membrane-filtration') return { label: 'Rinse · Membrane Filtration', key: 'cv:rinse:membrane', cvMethod: method };
  return { label: 'Rinse · Method not set', key: 'cv:rinse:unknown' };
}

export function groupListItems(workflow: Workflow, items: SearchItem[]): ListGroup[] {
  const groups = new Map<string, ListGroup>();
  items.forEach((item) => {
    const buildingSegment = buildingFilterSegment(item.building);
    const work = describe(workflow, item);
    const key = `${buildingSegment}:${work.key}`;
    const group = groups.get(key) || {
      key,
      building: buildingLabel(item.building),
      buildingSegment,
      label: work.label,
      workflowId: workflow.id,
      cvMethod: work.cvMethod,
      items: []
    };
    group.items.push(item);
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => ({
    ...group,
    items: group.items.slice().sort((a, b) => String(b.samplingDate || '').localeCompare(String(a.samplingDate || '')) || String(a.worksheetNo || '').localeCompare(String(b.worksheetNo || '')))
  })).sort((a, b) => a.buildingSegment.localeCompare(b.buildingSegment) || a.label.localeCompare(b.label));
}
