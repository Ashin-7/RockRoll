import { describe, expect, it } from 'vitest';
import { findTabStaffSystems } from './tab-staff-geometry';
import type { PdfLineSegment } from './toolbox.types';

function segment(y: number, x1 = 50, x2 = 250): PdfLineSegment {
  return { page: 1, x1, y1: y, x2, y2: y };
}

describe('findTabStaffSystems', () => {
  it('finds one reliable six-string system from equal horizontal vector lines', () => {
    expect(findTabStaffSystems([100, 110, 120, 130, 140, 150].map((y) => segment(y)))).toEqual([
      {
        page: 1,
        x1: 50,
        x2: 250,
        stringYs: [100, 110, 120, 130, 140, 150],
        averageStringGap: 10,
        confidence: 'high',
      },
    ]);
  });

  it('rejects incomplete or uneven line groups', () => {
    expect(findTabStaffSystems([100, 110, 120, 130, 140].map((y) => segment(y)))).toEqual([]);
    expect(findTabStaffSystems([100, 110, 120, 140, 150, 160].map((y) => segment(y)))).toEqual([]);
  });

  it('merges broken segments on one string row before evaluating the six-line system', () => {
    const segments = [
      segment(100),
      segment(110),
      segment(120, 50, 120),
      segment(120, 150, 250),
      segment(130),
      segment(140),
      segment(150),
    ];

    expect(findTabStaffSystems(segments)).toEqual([
      expect.objectContaining({ stringYs: [100, 110, 120, 130, 140, 150], x1: 50, x2: 250 }),
    ]);
  });

  it('keeps a system with one shortened string line as medium confidence', () => {
    const segments = [
      segment(100),
      segment(110),
      segment(120),
      segment(130, 100, 200),
      segment(140),
      segment(150),
    ];

    expect(findTabStaffSystems(segments)).toEqual([
      expect.objectContaining({ x1: 50, x2: 250, confidence: 'medium' }),
    ]);
  });
});
