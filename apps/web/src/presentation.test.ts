import { describe, expect, it } from 'vitest';
import { editableSampleFields, resultValueValid, visibleRecordFields } from './presentation';
describe('human presentation schema', () => {
  it('never exposes storage payload names', () => {
    const fields = visibleRecordFields({ samplesJson: '[{...}]', templatePayload: '{}', productName: 'A', lotPMembrane: 'M1' });
    expect(fields.map((field) => field.label)).toEqual(['Product', 'Membrane lot']);
    expect(JSON.stringify(fields)).not.toContain('samplesJson');
  });
  it('uses readable result labels and accepts legacy result text', () => {
    expect(editableSampleFields({ result1: '', resultAvg: '' }).map((field) => field.label)).toEqual(['Result I', 'Average result']);
    expect(['', '12.5', '<1', 'TNTC', 'Not detected'].every(resultValueValid)).toBe(true);
  });
});
