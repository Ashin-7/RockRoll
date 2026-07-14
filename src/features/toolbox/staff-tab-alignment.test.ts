import { describe, expect, it } from 'vitest';
import { findPairedStaffSystems } from './staff-tab-alignment';
import type { PdfLineSegment, TabStaffSystem } from './toolbox.types';

function segment(y: number, page = 1, x1 = 50, x2 = 250): PdfLineSegment {
  return { page, x1, y1: y, x2, y2: y };
}

function tabSystem(overrides: Partial<TabStaffSystem> = {}): TabStaffSystem {
  return {
    page: 1,
    x1: 50,
    x2: 250,
    stringYs: [80, 90, 100, 110, 120, 130],
    averageStringGap: 10,
    confidence: 'high',
    ...overrides,
  };
}

describe('findPairedStaffSystems', () => {
  it('pairs five equal standard staff rows with the unique TAB system below', () => {
    const lines = [40, 45, 50, 55, 60].map((y) => segment(y));
    const matchingTabSystem = tabSystem();

    expect(findPairedStaffSystems(lines, [matchingTabSystem])).toEqual([
      {
        page: 1,
        x1: 50,
        x2: 250,
        standardLineYs: [40, 45, 50, 55, 60],
        tabSystem: matchingTabSystem,
        confidence: 'high',
      },
    ]);
  });

  it('rejects groups containing four or six standard staff rows', () => {
    expect(findPairedStaffSystems([40, 45, 50, 55].map((y) => segment(y)), [tabSystem()])).toEqual([]);
    expect(findPairedStaffSystems([35, 40, 45, 50, 55, 60].map((y) => segment(y)), [tabSystem()])).toEqual([]);
  });

  it('rejects a TAB system beyond the relative vertical separation limit', () => {
    const distantTabSystem = tabSystem({
      stringYs: [121, 131, 141, 151, 161, 171],
    });

    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => segment(y)), [distantTabSystem])).toEqual([]);
  });

  it('rejects horizontal overlap below 80% of the shorter system width', () => {
    const lowOverlapTabSystem = tabSystem({ x1: 100, x2: 300 });

    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => segment(y)), [lowOverlapTabSystem])).toEqual([]);
  });

  it('rejects TAB systems from another page', () => {
    expect(
      findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => segment(y)), [tabSystem({ page: 2 })]),
    ).toEqual([]);
  });

  it('pairs only the nearest eligible TAB system below the standard staff', () => {
    const nearestTabSystem = tabSystem();
    const fartherTabSystem = tabSystem({
      stringYs: [100, 110, 120, 130, 140, 150],
    });

    expect(
      findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => segment(y)), [fartherTabSystem, nearestTabSystem]),
    ).toEqual([expect.objectContaining({ tabSystem: nearestTabSystem })]);
  });

  it('rejects non-unique nearest TAB matches', () => {
    const firstTabSystem = tabSystem();
    const secondTabSystem = tabSystem({ x1: 45, x2: 245 });

    expect(
      findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => segment(y)), [firstTabSystem, secondTabSystem]),
    ).toEqual([]);
  });
});
