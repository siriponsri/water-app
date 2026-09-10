import { describe, expect, it } from 'vitest';
import { blankPayloadKeys, mergePrintFill } from './printFill';

describe('print fill contract', () => {
  it('accepts only blank canonical payload keys', () => {
    const payload = { floor: '', gradeControl: '', samplingDate: '01 Sep 2026' };
    expect(blankPayloadKeys(payload)).toEqual(['floor', 'gradeControl']);
    expect(mergePrintFill(payload, { floor: '2', gradeControl: 'D', samplingDate: 'wrong', templatePath: 'bad' }))
      .toEqual({ floor: '2', gradeControl: 'D', samplingDate: '01 Sep 2026' });
  });
});
