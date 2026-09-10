import { describe, expect, it } from 'vitest';
import { queueScope } from './printQueue';

describe('print queue scope', () => {
  it('uses the explicit work scope', () => {
    expect(queueScope([{ domain: 'water', workflow: 'pw-prw', recordKey: '1', worksheetNo: 'WT-1', scope: 'B10:pw-prw' }])).toBe('B10:pw-prw');
  });
});
