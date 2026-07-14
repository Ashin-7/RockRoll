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
    const lines = [160, 165, 170, 175, 180].map((y) => segment(y));
    const matchingTabSystem = tabSystem();

    expect(findPairedStaffSystems(lines, [matchingTabSystem])).toEqual([
      {
        page: 1,
        x1: 50,
        x2: 250,
        standardLineYs: [160, 165, 170, 175, 180],
        tabSystem: matchingTabSystem,
        confidence: 'high',
      },
    ]);
  });

  it('rejects groups containing four or six standard staff rows', () => {
    expect(findPairedStaffSystems([160, 165, 170, 175].map((y) => segment(y)), [tabSystem()])).toEqual([]);
    expect(findPairedStaffSystems([155, 160, 165, 170, 175, 180].map((y) => segment(y)), [tabSystem()])).toEqual([]);
  });

  it('rejects a TAB system beyond the relative vertical separation limit', () => {
    const distantTabSystem = tabSystem({
      stringYs: [49, 59, 69, 79, 89, 99],
    });

    expect(findPairedStaffSystems([160, 165, 170, 175, 180].map((y) => segment(y)), [distantTabSystem])).toEqual([]);
  });

  it('rejects horizontal overlap below 80% of the shorter system width', () => {
    const lowOverlapTabSystem = tabSystem({ x1: 100, x2: 300 });

    expect(findPairedStaffSystems([160, 165, 170, 175, 180].map((y) => segment(y)), [lowOverlapTabSystem])).toEqual([]);
  });

  it('rejects TAB systems from another page', () => {
    expect(
      findPairedStaffSystems([160, 165, 170, 175, 180].map((y) => segment(y)), [tabSystem({ page: 2 })]),
    ).toEqual([]);
  });

  it('pairs only the nearest eligible TAB system below the standard staff', () => {
    const nearestTabSystem = tabSystem();
    const fartherTabSystem = tabSystem({
      stringYs: [60, 70, 80, 90, 100, 110],
    });

    expect(
      findPairedStaffSystems([160, 165, 170, 175, 180].map((y) => segment(y)), [fartherTabSystem, nearestTabSystem]),
    ).toEqual([expect.objectContaining({ tabSystem: nearestTabSystem })]);
  });

  it('rejects non-unique nearest TAB matches', () => {
    const firstTabSystem = tabSystem();
    const secondTabSystem = tabSystem({ x1: 45, x2: 245 });

    expect(
      findPairedStaffSystems([160, 165, 170, 175, 180].map((y) => segment(y)), [firstTabSystem, secondTabSystem]),
    ).toEqual([]);
  });

  it('keeps two side-by-side five-line staffs independent', () => {
    const lines = [160, 165, 170, 175, 180].flatMap((y) => [segment(y, 1, 50, 150), segment(y, 1, 250, 350)]);
    const leftTabSystem = tabSystem({ x1: 50, x2: 150 });
    const rightTabSystem = tabSystem({ x1: 250, x2: 350 });

    expect(findPairedStaffSystems(lines, [leftTabSystem, rightTabSystem])).toEqual([
      expect.objectContaining({ x1: 50, x2: 150, tabSystem: leftTabSystem }),
      expect.objectContaining({ x1: 250, x2: 350, tabSystem: rightTabSystem }),
    ]);
  });

  it('rejects equal-length rows without 80% common horizontal coverage', () => {
    const lines = [
      segment(160, 1, 50, 250),
      segment(165, 1, 61, 261),
      segment(170, 1, 72, 272),
      segment(175, 1, 83, 283),
      segment(180, 1, 94, 294),
    ];

    expect(findPairedStaffSystems(lines, [tabSystem()])).toEqual([]);
  });

  it('rejects zero or negative vertical gaps', () => {
    const lines = [160, 165, 170, 175, 180].map((y) => segment(y));

    expect(
      findPairedStaffSystems(lines, [tabSystem({ stringYs: [110, 120, 130, 140, 150, 160] })]),
    ).toEqual([]);
    expect(
      findPairedStaffSystems(lines, [tabSystem({ stringYs: [115, 125, 135, 145, 155, 165] })]),
    ).toEqual([]);
  });

  it('accepts a TAB system exactly at the maximum vertical separation', () => {
    const boundaryTabSystem = tabSystem({ stringYs: [50, 60, 70, 80, 90, 100] });

    expect(findPairedStaffSystems([160, 165, 170, 175, 180].map((y) => segment(y)), [boundaryTabSystem])).toEqual([
      expect.objectContaining({ tabSystem: boundaryTabSystem }),
    ]);
  });

  it('accepts exactly 80% horizontal overlap with the TAB system', () => {
    const boundaryTabSystem = tabSystem({ x1: 90, x2: 290 });

    expect(findPairedStaffSystems([160, 165, 170, 175, 180].map((y) => segment(y)), [boundaryTabSystem])).toEqual([
      expect.objectContaining({ tabSystem: boundaryTabSystem }),
    ]);
  });

  it('accepts exactly 80% common horizontal coverage across the five standard rows', () => {
    const lines = [
      segment(160, 1, 50, 250),
      segment(165, 1, 60, 260),
      segment(170, 1, 70, 270),
      segment(175, 1, 80, 280),
      segment(180, 1, 90, 290),
    ];

    expect(findPairedStaffSystems(lines, [tabSystem()])).toHaveLength(1);
  });

  it('accepts line-gap deviation of exactly one PDF unit and rejects greater deviation', () => {
    const boundaryLines = [160, 165, 171, 176, 182].map((y) => segment(y));
    const excessiveDeviationLines = [160, 165, 172, 177, 184].map((y) => segment(y));

    expect(findPairedStaffSystems(boundaryLines, [tabSystem()])).toHaveLength(1);
    expect(findPairedStaffSystems(excessiveDeviationLines, [tabSystem()])).toEqual([]);
  });

  it('does not accept five rows from a six-line group when the sixth row has a shifted horizontal range', () => {
    const lines = [160, 165, 170, 175, 180].map((y) => segment(y));
    lines.push(segment(185, 1, 100, 300));

    expect(findPairedStaffSystems(lines, [tabSystem()])).toEqual([]);
  });

  it('accepts a three-unit horizontal path gap and separates a four-unit gap', () => {
    const withGap = (gap: number) => [160, 165, 170, 175, 180].flatMap((y) => [
      segment(y, 1, 50, 100),
      segment(y, 1, 100 + gap, 150),
    ]);

    expect(findPairedStaffSystems(withGap(3), [tabSystem({ x1: 50, x2: 150 })])).toHaveLength(1);
    expect(findPairedStaffSystems(withGap(4), [tabSystem({ x1: 50, x2: 150 })])).toEqual([]);
  });

  it('keeps the clearly nearest standard staff when two standards compete for one TAB', () => {
    const lines = [160, 165, 170, 175, 180].flatMap((y) => [
      segment(y, 1, 50, 150),
      segment(y + 30, 1, 250, 350),
    ]);
    const sharedTab = tabSystem({ x1: 50, x2: 350 });

    expect(findPairedStaffSystems(lines, [sharedTab])).toEqual([
      expect.objectContaining({ standardLineYs: [160, 165, 170, 175, 180], tabSystem: sharedTab }),
    ]);
  });

  it('rejects both standards when their competition for one TAB is within one staff gap', () => {
    const lines = [160, 165, 170, 175, 180].flatMap((y) => [
      segment(y, 1, 50, 150),
      segment(y + 5, 1, 250, 350),
    ]);

    expect(findPairedStaffSystems(lines, [tabSystem({ x1: 50, x2: 350 })])).toEqual([]);
  });
});
