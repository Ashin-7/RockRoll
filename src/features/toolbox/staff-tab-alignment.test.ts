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

  it('keeps two side-by-side five-line staffs independent', () => {
    const lines = [40, 45, 50, 55, 60].flatMap((y) => [segment(y, 1, 50, 150), segment(y, 1, 250, 350)]);
    const leftTabSystem = tabSystem({ x1: 50, x2: 150 });
    const rightTabSystem = tabSystem({ x1: 250, x2: 350 });

    expect(findPairedStaffSystems(lines, [leftTabSystem, rightTabSystem])).toEqual([
      expect.objectContaining({ x1: 50, x2: 150, tabSystem: leftTabSystem }),
      expect.objectContaining({ x1: 250, x2: 350, tabSystem: rightTabSystem }),
    ]);
  });

  it('rejects equal-length rows without 80% common horizontal coverage', () => {
    const lines = [
      segment(40, 1, 50, 250),
      segment(45, 1, 61, 261),
      segment(50, 1, 72, 272),
      segment(55, 1, 83, 283),
      segment(60, 1, 94, 294),
    ];

    expect(findPairedStaffSystems(lines, [tabSystem()])).toEqual([]);
  });

  it('rejects zero or negative vertical gaps', () => {
    const lines = [40, 45, 50, 55, 60].map((y) => segment(y));

    expect(
      findPairedStaffSystems(lines, [tabSystem({ stringYs: [60, 70, 80, 90, 100, 110] })]),
    ).toEqual([]);
    expect(
      findPairedStaffSystems(lines, [tabSystem({ stringYs: [55, 65, 75, 85, 95, 105] })]),
    ).toEqual([]);
  });

  it('accepts a TAB system exactly at the maximum vertical separation', () => {
    const boundaryTabSystem = tabSystem({ stringYs: [120, 130, 140, 150, 160, 170] });

    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => segment(y)), [boundaryTabSystem])).toEqual([
      expect.objectContaining({ tabSystem: boundaryTabSystem }),
    ]);
  });

  it('accepts exactly 80% horizontal overlap with the TAB system', () => {
    const boundaryTabSystem = tabSystem({ x1: 90, x2: 290 });

    expect(findPairedStaffSystems([40, 45, 50, 55, 60].map((y) => segment(y)), [boundaryTabSystem])).toEqual([
      expect.objectContaining({ tabSystem: boundaryTabSystem }),
    ]);
  });

  it('accepts exactly 80% common horizontal coverage across the five standard rows', () => {
    const lines = [
      segment(40, 1, 50, 250),
      segment(45, 1, 60, 260),
      segment(50, 1, 70, 270),
      segment(55, 1, 80, 280),
      segment(60, 1, 90, 290),
    ];

    expect(findPairedStaffSystems(lines, [tabSystem()])).toHaveLength(1);
  });

  it('accepts line-gap deviation of exactly one PDF unit and rejects greater deviation', () => {
    const boundaryLines = [40, 45, 51, 56, 62].map((y) => segment(y));
    const excessiveDeviationLines = [40, 45, 52, 57, 64].map((y) => segment(y));

    expect(findPairedStaffSystems(boundaryLines, [tabSystem()])).toHaveLength(1);
    expect(findPairedStaffSystems(excessiveDeviationLines, [tabSystem()])).toEqual([]);
  });

  it('does not accept five rows from a six-line group when the sixth row has a shifted horizontal range', () => {
    const lines = [40, 45, 50, 55, 60].map((y) => segment(y));
    lines.push(segment(65, 1, 100, 300));

    expect(findPairedStaffSystems(lines, [tabSystem()])).toEqual([]);
  });
});
