import { describe, expect, it } from 'vitest';
import { workflows } from './appData';
import { groupListItems } from './listGroups';

describe('List grouping', () => {
  it('separates CV methods under Other without changing worksheet IDs', () => {
    const workflow = workflows.find((item) => item.id === 'cv')!;
    const groups = groupListItems(workflow, [
      { recordKey: 'a', worksheetNo: 'CVR-26-OT-0001', building: 'B19', sampleMatrix: 'Rinse', testMethod: 'MEMBRANE_FILTRATION' },
      { recordKey: 'b', worksheetNo: 'CVR-26-OT-0002', building: 'Building 11', sampleMatrix: 'Rinse', testMethod: 'POUR_PLATE' }
    ]);
    expect(groups.map((group) => group.label)).toEqual(['Rinse · Pour Plate', 'Rinse · Membrane Filtration']);
    expect(groups.map((group) => group.buildingSegment)).toEqual(['OTHER', 'OTHER']);
    expect(groups.map((group) => group.building)).toEqual(['Other Locations', 'Other Locations']);
    expect(groups[0].items[0].worksheetNo).toBe('CVR-26-OT-0002');
  });
});
