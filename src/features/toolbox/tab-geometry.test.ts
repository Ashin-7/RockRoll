import { describe, expect, it } from 'vitest';
import { locateTabFrets } from './tab-geometry';
import type { PdfTextItem, TabStaffSystem } from './toolbox.types';

function textItem(text: string, x: number, y: number, fontSize = 10): PdfTextItem {
  return { text, x, y, width: text.length * fontSize, height: fontSize, fontSize, page: 1 };
}

describe('locateTabFrets', () => {
  it('locates fret numbers on six evenly spaced tab strings inside measure ranges', () => {
    const stringRows = [100, 110, 120, 130, 140, 150];
    const items = [
      textItem('1', 40, 80, 8),
      textItem('2', 220, 80, 8),
      ...stringRows.map((y, index) => textItem(index === 0 ? '3' : '0', 80, y)),
      ...stringRows.map((y, index) => textItem(index === 5 ? '12' : '0', 260, y)),
    ];

    expect(locateTabFrets(items, [1, 2])).toEqual({
      positions: [
        { page: 1, measureNumber: 1, stringNumber: 1, fret: 3, x: 80, y: 100, confidence: 'high' },
        { page: 1, measureNumber: 1, stringNumber: 2, fret: 0, x: 80, y: 110, confidence: 'high' },
        { page: 1, measureNumber: 1, stringNumber: 3, fret: 0, x: 80, y: 120, confidence: 'high' },
        { page: 1, measureNumber: 1, stringNumber: 4, fret: 0, x: 80, y: 130, confidence: 'high' },
        { page: 1, measureNumber: 1, stringNumber: 5, fret: 0, x: 80, y: 140, confidence: 'high' },
        { page: 1, measureNumber: 1, stringNumber: 6, fret: 0, x: 80, y: 150, confidence: 'high' },
        { page: 1, measureNumber: 2, stringNumber: 1, fret: 0, x: 260, y: 100, confidence: 'high' },
        { page: 1, measureNumber: 2, stringNumber: 2, fret: 0, x: 260, y: 110, confidence: 'high' },
        { page: 1, measureNumber: 2, stringNumber: 3, fret: 0, x: 260, y: 120, confidence: 'high' },
        { page: 1, measureNumber: 2, stringNumber: 4, fret: 0, x: 260, y: 130, confidence: 'high' },
        { page: 1, measureNumber: 2, stringNumber: 5, fret: 0, x: 260, y: 140, confidence: 'high' },
        { page: 1, measureNumber: 2, stringNumber: 6, fret: 12, x: 260, y: 150, confidence: 'high' },
      ],
      warnings: [],
    });
  });

  it('rejects out-of-range and ambiguous candidates without discarding the reliable string rows', () => {
    const stringRows = [100, 110, 120, 130, 140, 150];
    const items = [
      textItem('1', 40, 80, 8),
      textItem('2', 220, 80, 8),
      ...stringRows.map((y) => textItem('0', 80, y)),
      ...stringRows.map((y) => textItem('0', 260, y)),
      textItem('25', 120, 100),
      textItem('7', 140, 105),
      textItem('12', 280, 130),
    ];

    const result = locateTabFrets(items, [1, 2]);

    expect(result.positions).toContainEqual(expect.objectContaining({
      measureNumber: 2,
      stringNumber: 4,
      fret: 12,
      confidence: 'high',
    }));
    expect(result.warnings).toEqual([
      'Ignored 1 out-of-range tab fret candidate.',
      'Ignored 1 ambiguous tab fret candidate.',
    ]);
  });

  it('keeps a string-aligned fret near a measure boundary with medium confidence', () => {
    const stringRows = [100, 110, 120, 130, 140, 150];
    const items = [
      textItem('1', 40, 80, 8),
      textItem('2', 220, 80, 8),
      ...stringRows.map((y) => textItem('0', 80, y)),
      ...stringRows.map((y) => textItem('0', 260, y)),
      textItem('5', 130, 120),
    ];

    const result = locateTabFrets(items, [1, 2]);

    expect(result.positions).toContainEqual(expect.objectContaining({
      measureNumber: 2,
      stringNumber: 3,
      fret: 5,
      confidence: 'medium',
    }));
    expect(result.warnings).toContain('1 tab fret candidate was near a measure boundary.');
  });

  it('uses a vector tab staff system when sparse fret text cannot form six text rows', () => {
    const staffSystem: TabStaffSystem = {
      page: 1,
      x1: 50,
      x2: 250,
      stringYs: [100, 110, 120, 130, 140, 150],
      averageStringGap: 10,
      confidence: 'high',
    };
    const items = [
      textItem('1', 40, 80, 8),
      textItem('2', 220, 80, 8),
      textItem('7', 120, 120),
    ];

    expect(locateTabFrets(items, [1, 2], [staffSystem])).toEqual({
      positions: [
        { page: 1, measureNumber: 1, stringNumber: 3, fret: 7, x: 120, y: 120, confidence: 'high' },
      ],
      warnings: [],
    });
  });

  it('warns separately when a medium-confidence vector system is used', () => {
    const staffSystem: TabStaffSystem = {
      page: 1,
      x1: 50,
      x2: 250,
      stringYs: [100, 110, 120, 130, 140, 150],
      averageStringGap: 10,
      confidence: 'medium',
    };
    const items = [
      textItem('1', 40, 80, 8),
      textItem('2', 220, 80, 8),
      textItem('7', 120, 120),
    ];

    expect(locateTabFrets(items, [1, 2], [staffSystem])).toEqual({
      positions: [
        { page: 1, measureNumber: 1, stringNumber: 3, fret: 7, x: 120, y: 120, confidence: 'medium' },
      ],
      warnings: ['Used 1 medium-confidence tab staff system; review its fret positions.'],
    });
  });
});
