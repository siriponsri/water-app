import { describe, expect, it } from 'vitest';
import { blankPayloadKeys, mergePrintFill, printableFields } from './printFill';

describe('print fill contract', () => {
  it('accepts editable canonical payload keys without changing System DB data', () => {
    const payload = { floor: '', gradeControl: '', samplingDate: '01 Sep 2026' };
    expect(blankPayloadKeys(payload)).toEqual(['floor', 'gradeControl']);
    expect(mergePrintFill(payload, { floor: '2', gradeControl: 'D', samplingDate: 'wrong', templatePath: 'bad' }))
      .toEqual({ floor: '2', gradeControl: 'D', samplingDate: 'wrong' });
  });

  it('presents printable fields without internal DOCX names', () => {
    const fields = printableFields({ resultAvg01: '', lotMembrane: '', samplingPoint01: '', sampleCount: '1' });
    expect(fields.map((field) => field.label)).toEqual(['Average result 01', 'Membrane lot', 'Sampling point 01']);
    expect(fields.map((field) => field.label).join(' ')).not.toMatch(/resultAvg|lotMembrane|sampleCount/);
  });
});
