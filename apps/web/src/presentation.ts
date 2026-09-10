import type { RecordData } from './storage';

export type PresentationField = { key: string; label: string; section: 'General' | 'Sampling' | 'Media' | 'Results' | 'Approval'; editable?: boolean };

const FIELDS: PresentationField[] = [
  { key: 'productName', label: 'Product', section: 'General', editable: true },
  { key: 'ProductName', label: 'Product', section: 'General', editable: true },
  { key: 'building', label: 'Building', section: 'General' },
  { key: 'sectionName', label: 'Section', section: 'General', editable: true },
  { key: 'samplingDate', label: 'Sampling date', section: 'Sampling', editable: true },
  { key: 'performedDate', label: 'Performed date', section: 'Sampling', editable: true },
  { key: 'samplingTime', label: 'Sampling time', section: 'Sampling', editable: true },
  { key: 'temp', label: 'Room temperature', section: 'Sampling', editable: true },
  { key: 'lotTSA', label: 'TSA lot', section: 'Media', editable: true },
  { key: 'lotPCA', label: 'PCA lot', section: 'Media', editable: true },
  { key: 'lotPlate', label: 'Plate lot', section: 'Media', editable: true },
  { key: 'lotMembrane', label: 'Membrane lot', section: 'Media', editable: true },
  { key: 'lotPMembrane', label: 'Membrane lot', section: 'Media', editable: true },
  { key: 'negativeValue', label: 'Negative control', section: 'Results', editable: true },
  { key: 'comment', label: 'Comment', section: 'Results', editable: true },
  { key: 'determinedDate', label: 'Determined date', section: 'Approval', editable: true },
  { key: 'concludedDate', label: 'Concluded date', section: 'Approval', editable: true },
  { key: 'approvedDate', label: 'Approved date', section: 'Approval', editable: true }
];

const SAMPLE_FIELDS: PresentationField[] = [
  { key: 'samplingPoint', label: 'Sampling point', section: 'Sampling', editable: true },
  { key: 'roomNo', label: 'Room / point', section: 'Sampling', editable: true },
  { key: 'equipment', label: 'Equipment', section: 'Sampling', editable: true },
  { key: 'location', label: 'Location', section: 'Sampling', editable: true },
  { key: 'grade', label: 'Grade', section: 'Sampling', editable: true },
  { key: 'result1', label: 'Result I', section: 'Results', editable: true },
  { key: 'result2', label: 'Result II', section: 'Results', editable: true },
  { key: 'resultAvg', label: 'Average result', section: 'Results', editable: true },
  { key: 'result', label: 'Result', section: 'Results', editable: true },
  { key: 'occResult', label: 'Result', section: 'Results', editable: true },
  { key: 'occurResult', label: 'Result', section: 'Results', editable: true },
  { key: 'remark', label: 'Remark', section: 'Results', editable: true }
];

const forbidden = /^(samplesJson|templatePayload)$/i;
export function visibleRecordFields(record: RecordData) {
  return FIELDS.filter((field, index, all) => !forbidden.test(field.key) && record[field.key] !== '' && record[field.key] != null
    && all.findIndex((entry) => entry.label === field.label && record[entry.key] !== '' && record[entry.key] != null) === index);
}
export function visibleSampleFields(sample: RecordData) { return SAMPLE_FIELDS.filter((field) => sample[field.key] !== '' && sample[field.key] != null); }
export function editableRecordFields(record: RecordData) { return FIELDS.filter((field) => field.editable && Object.prototype.hasOwnProperty.call(record, field.key)); }
export function editableSampleFields(sample: RecordData) { return SAMPLE_FIELDS.filter((field) => field.editable && Object.prototype.hasOwnProperty.call(sample, field.key)); }
export function resultValueValid(value: string) { return value === '' || /^-?\d+(?:\.\d+)?$/.test(value.trim()) || /^(<1|TNTC)$/i.test(value.trim()) || /^[^{}[\]]{1,80}$/.test(value.trim()); }
