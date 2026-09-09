import { describe, expect, it } from 'vitest';
import { workflows } from './appData';
import { groupListItems } from './listGroups';

describe('List grouping', () => {
  it('separates CV methods and Other buildings without changing worksheet IDs', () => {
    const workflow = workflows.find((item) => item.id === 'cv')!;
    const groups = groupListItems(workflow, [
      { recordKey: 'a', worksheetNo: 'CVR-26-OT-0001', building: 'B19', sampleMatrix: 'Rinse', testMethod: 'MEMBRANE_FILTRATION' },
      { recordKey: 'b', worksheetNo: 'CVR-26-OT-0002', building: 'Building 11', sampleMatrix: 'Rinse', testMethod: 'POUR_PLATE' }
    ]);
    expect(groups.map((group) => group.label)).toEqual(['Rinse · Pour Plate', 'Rinse · Membrane Filtration']);
    expect(groups.map((group) => group.buildingSegment)).toEqual(['B11', 'B19']);
    expect(groups[0].items[0].worksheetNo).toBe('CVR-26-OT-0002');
  });
});
