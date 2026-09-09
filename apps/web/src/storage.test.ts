import { describe, expect, it } from 'vitest';
import { searchCacheKey } from './storage';

/* Keyed on the workflow alone, every building shared one cache entry, so going
   offline in the Building 10 binder listed Building 12's worksheets. */
describe('searchCacheKey', () => {
  it('keys on the bare workflow when nothing is filtered', () => {
    expect(searchCacheKey('pw-prw')).toBe('pw-prw');
    expect(searchCacheKey('pw-prw', {})).toBe('pw-prw');
    expect(searchCacheKey('pw-prw', { building: '' })).toBe('pw-prw');
  });

  it('separates two buildings of the same workflow', () => {
    const b10 = searchCacheKey('em-air', { building: 'Building 10', samplingMode: 'passive,active' });
    const b12 = searchCacheKey('em-air', { building: 'Building 12', samplingMode: 'passive,active' });
    expect(b10).not.toBe(b12);
  });

  it('is stable regardless of how the filter object was built', () => {
    const one = searchCacheKey('compressed-air', { building: 'Building 16', gasType: 'CA,N2' });
    const two = searchCacheKey('compressed-air', { gasType: 'CA,N2', building: 'Building 16' });
    expect(one).toBe(two);
  });

  it('ignores a filter set to "all", which the routes omit anyway', () => {
    expect(searchCacheKey('pw-prw', { waterType: 'all' })).toBe('pw-prw');
  });

  it('separates the CV families and methods', () => {
    const contact = searchCacheKey('cv', { building: 'Building 16', samplingFamily: 'contact-plate' });
    const pour = searchCacheKey('cv', { building: 'Building 16', samplingFamily: 'rinse', testMethod: 'pour-plate' });
    const membrane = searchCacheKey('cv', { building: 'Building 16', samplingFamily: 'rinse', testMethod: 'membrane-filtration' });
    expect(new Set([contact, pour, membrane]).size).toBe(3);
  });
});
