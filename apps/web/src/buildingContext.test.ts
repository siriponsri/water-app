import { describe, expect, it } from 'vitest';
import { buildingFilterSegment, buildingLabel } from './recordScope';

describe('building context contracts', () => {
  it('recognises composite source labels for filtering only', () => {
    expect(buildingFilterSegment('OSD-PW (Building 10)')).toBe('B10');
    expect(buildingFilterSegment('B19')).toBe('OTHER');
    expect(buildingFilterSegment('unknown')).toBe('OTHER');
    expect(buildingLabel('Other')).toBe('Other Locations');
  });
});
