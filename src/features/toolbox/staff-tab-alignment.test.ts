import { describe, expect, it } from 'vitest';
import { findPairedStaffSystems } from './staff-tab-alignment';
import type { PdfLineSegment, TabStaffSystem } from './toolbox.types';

function line(y: number, x1 = 50, x2 = 250, page = 1): PdfLineSegment {
  return { page, x1, y1: y, x2, y2: y };
}

function tabSystem(
  stringYs: TabStaffSystem['stringYs'] = [80, 90, 100, 110, 120, 130],
  overrides: Partial<TabStaffSystem> = {},
): TabStaffSystem {
  return {
    page: 1,
    x1: 50,
    x2: 250,
    stringYs,
    averageStringGap: 10,
    confidence: 'high',
    ...overrides,
  };
}

describe('findPairedStaffSystems', () => {
  it('pairs one five-line standard staff with the unique TAB system below it', () => {
    const tab = tabSystem();

    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => line(y)), [tab])).toEqual([
      {
        page: 1,
        x1: 50,
        x2: 250,
        standardLineYs: [40, 45, 50, 55, 60],
        averageStaffGap: 5,
        tabSystem: tab,
        confidence: 'high',
      },
    ]);
  });

  it('rejects four-line and six-line standard-staff candidates', () => {
    const tab = tabSystem();

    expect(findPairedStaffSystems([40, 45, 50, 55].map((y) => line(y)), [tab])).toEqual([]);
    expect(findPairedStaffSystems([40, 45, 50, 55, 60, 65].map((y) => line(y)), [tab])).toEqual([]);
  });

  it('rejects a five-line candidate with uneven staff gaps', () => {
    expect(findPairedStaffSystems([40, 45, 50, 58, 63].map((y) => line(y)), [tabSystem()])).toEqual([]);
  });

  it('does not pair standard and TAB systems across pages', () => {
    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => line(y)), [
      tabSystem([80, 90, 100, 110, 120, 130], { page: 2 }),
    ])).toEqual([]);
  });

  it('rejects a TAB system whose overlap is below 80% of the shorter width', () => {
    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => line(y)), [
      tabSystem([80, 90, 100, 110, 120, 130], { x1: 150, x2: 350 }),
    ])).toEqual([]);
  });

  it('rejects a TAB system beyond the staff-gap-derived vertical bound', () => {
    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => line(y)), [
      tabSystem([200, 210, 220, 230, 240, 250]),
    ])).toEqual([]);
  });

  it('rejects non-unique nearest TAB matches', () => {
    const first = tabSystem();
    const second = tabSystem([80, 90, 100, 110, 120, 130], { x1: 40, x2: 240 });

    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => line(y)), [first, second])).toEqual([]);
  });
});
