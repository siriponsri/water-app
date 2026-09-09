import { describe, expect, it } from 'vitest';
import { buildingSegment, filterRecordScope, filterValues } from './recordScope';

describe('record scope filtering', () => {
  const items = [
    { recordKey: '1', building: 'Building 10', sampleMatrix: 'PW_PRW', testMethod: 'POUR_PLATE' },
    { recordKey: '2', building: 'Building 12', sampleMatrix: 'PW_PRW', testMethod: 'POUR_PLATE' },
    { recordKey: '3', building: 'Building 10', sampleMatrix: 'CONTACT_PLATE', testMethod: 'CONTACT_PLATE' },
  ];

  it('keeps only the selected building', () => {
    expect(filterRecordScope(items, { building: 'Building 10' }).map((item) => item.recordKey)).toEqual(['1', '3']);
  });

  it('keeps only the selected CV family', () => {
    expect(filterRecordScope(items, { building: 'Building 10', samplingFamily: 'contact-plate' }).map((item) => item.recordKey)).toEqual(['3']);
  });

  /* The building column is free text and holds every spelling. Comparing whole
     labels emptied a binder silently whenever the sheet drifted. */
  describe('building spelling drift', () => {
    it('reads every form of a building label as one segment', () => {
      expect(buildingSegment('Building 12')).toBe('B12');
      expect(buildingSegment('B12')).toBe('B12');
      expect(buildingSegment('12')).toBe('B12');
      expect(buildingSegment('bldg-12')).toBe('B12');
      expect(buildingSegment('BLD_12')).toBe('B12');
    });

    it('matches a record whose cell spells the building differently', () => {
      const drifted = [
        { recordKey: 'a', building: 'B12' },
        { recordKey: 'b', building: '12' },
        { recordKey: 'c', building: 'Building 12' },
        { recordKey: 'd', building: 'Building 16' },
      ];
      expect(filterRecordScope(drifted, { building: 'Building 12' }).map((item) => item.recordKey)).toEqual(['a', 'b', 'c']);
    });

    it('covers Building 11 and 19, which share the Other Locations binder', () => {
      expect(buildingSegment('Building 11')).toBe('B11');
      expect(buildingSegment('Building 19')).toBe('B19');
      const other = [
        { recordKey: 'a', building: 'Building 11' },
        { recordKey: 'b', building: 'B19' },
        { recordKey: 'c', building: 'Building 10' },
      ];
      expect(filterRecordScope(other, { building: 'Building 11' }).map((item) => item.recordKey)).toEqual(['a']);
      expect(filterRecordScope(other, { building: 'Building 19' }).map((item) => item.recordKey)).toEqual(['b']);
    });

    it('does not let an unrecognised label match everything', () => {
      const rows = [{ recordKey: 'a', building: 'Warehouse' }, { recordKey: 'b', building: 'Building 10' }];
      expect(filterRecordScope(rows, { building: 'Warehouse' }).map((item) => item.recordKey)).toEqual(['a']);
    });
  });

  describe('multi-value filters', () => {
    it('splits a comma-joined filter into its alternatives', () => {
      expect(filterValues('passive,active')).toEqual(['passive', 'active']);
      expect(filterValues('CA, N2')).toEqual(['CA', 'N2']);
      expect(filterValues(undefined)).toEqual([]);
      expect(filterValues('')).toEqual([]);
    });

    it('keeps a record matching any one alternative of testMethod', () => {
      expect(filterRecordScope(items, { testMethod: 'pour-plate,contact-plate' }).map((item) => item.recordKey)).toEqual(['1', '2', '3']);
      expect(filterRecordScope(items, { testMethod: 'contact-plate' }).map((item) => item.recordKey)).toEqual(['3']);
    });

    /* These describe the samples inside a record, which a search row does not
       carry. They must be left to the System DB rather than dropping rows here
       against a field that does not exist. */
    it('ignores sample-level filters instead of emptying the list', () => {
      const rows = [{ recordKey: 'a', building: 'Building 16' }];
      expect(filterRecordScope(rows, { gasType: 'CA,N2' }).map((item) => item.recordKey)).toEqual(['a']);
      expect(filterRecordScope(rows, { samplingMode: 'passive,active' }).map((item) => item.recordKey)).toEqual(['a']);
      expect(filterRecordScope(rows, { waterType: 'WFI/PUS' }).map((item) => item.recordKey)).toEqual(['a']);
    });
  });
});
