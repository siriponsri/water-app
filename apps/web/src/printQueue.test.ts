import { describe, expect, it } from 'vitest';
import { queueReturnTo } from './printQueue';

describe('print queue return routes', () => {
  it('returns to the exact scoped list after print or an empty queue', () => {
    expect(queueReturnTo([{ domain: 'air', workflow: 'em-air', recordKey: '1', worksheetNo: 'AT-1', scope: 'Building 10', returnTo: '/list?building=Building+10&workflow=em-air&samplingMode=passive%2Cactive' }]))
      .toBe('/list?building=Building+10&workflow=em-air&samplingMode=passive%2Cactive');
  });

  it('keeps legacy queues safe by falling back to the unified list', () => {
    expect(queueReturnTo([{ domain: 'air', workflow: 'em-air', recordKey: '1', worksheetNo: 'AT-1', scope: 'Building 10' }])).toBe('/list');
  });
});
