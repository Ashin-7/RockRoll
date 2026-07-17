import { describe, expect, it } from 'vitest';
import { analyzeTabScore, validatePdfFile } from './tab-analyzer';
import type {
  PdfBounds,
  PdfDocumentSnapshot,
  PdfMusicGlyphEvidence,
  PdfPaintedShape,
  PdfTextItem,
  PdfVectorSubpath,
} from './toolbox.types';

function textItem(text: string, page: number, x: number, y: number, fontSize: number): PdfTextItem {
  return { text, page, x, y, width: text.length * fontSize, height: fontSize, fontSize };
}

function rectangleSubpath(bounds: PdfBounds): PdfVectorSubpath {
  return {
    closed: true,
    commands: [
      { type: 'move', x: bounds.x1, y: bounds.y1 },
      { type: 'line', x: bounds.x2, y: bounds.y1 },
      { type: 'line', x: bounds.x2, y: bounds.y2 },
      { type: 'line', x: bounds.x1, y: bounds.y2 },
    ],
  };
}

function wholeNoteShape(): PdfPaintedShape {
  const outerBounds = { x1: 115, y1: 47, x2: 125, y2: 55 };
  const innerBounds = { x1: 118, y1: 49, x2: 122, y2: 53 };

  return {
    page: 1,
    paint: 'fill',
    fillRule: 'evenodd',
    strokeWidth: null,
    subpaths: [rectangleSubpath(outerBounds), rectangleSubpath(innerBounds)],
    bounds: outerBounds,
  };
}

function quarterNoteShapes(): PdfPaintedShape[] {
  const headBounds = { x1: 114, y1: 54, x2: 126, y2: 64 };
  const stemBounds = { x1: 126, y1: 30, x2: 126, y2: 59 };

  return [
    {
      page: 1,
      paint: 'fill',
      fillRule: 'nonzero',
      strokeWidth: null,
      subpaths: [rectangleSubpath(headBounds)],
      bounds: headBounds,
    },
    {
      page: 1,
      paint: 'stroke',
      fillRule: 'nonzero',
      strokeWidth: 0.5,
      subpaths: [{
        closed: false,
        commands: [
          { type: 'move', x: stemBounds.x1, y: stemBounds.y1 },
          { type: 'line', x: stemBounds.x2, y: stemBounds.y2 },
        ],
      }],
      bounds: stemBounds,
    },
  ];
}

function musicGlyph(
  semantic: PdfMusicGlyphEvidence['semantic'],
  overrides: Partial<PdfMusicGlyphEvidence> = {},
): PdfMusicGlyphEvidence {
  return {
    page: 1,
    bounds: { x1: 114, y1: 42, x2: 126, y2: 56 },
    fontName: 'Bravura',
    fontFamily: 'Bravura',
    text: '\uE1D2',
    semantic,
    mapping: 'reliable',
    ...overrides,
  };
}

function rhythmSnapshot(overrides: Partial<PdfDocumentSnapshot> = {}): PdfDocumentSnapshot {
  const standardRows = [40, 50, 60, 70, 80];
  const tabRows = [120, 130, 140, 150, 160, 170];

  return {
    fileName: 'rhythm.pdf',
    pageCount: 1,
    textItems: [
      textItem('Rhythm', 1, 20, 20, 20),
      textItem('=120', 1, 20, 28, 9.52),
      textItem('1', 1, 40, 30, 8),
      textItem('2', 1, 220, 30, 8),
      textItem('7', 1, 120, 140, 10),
    ],
    vectorDrawingCount: 20,
    imageCount: 0,
    lineSegments: [...standardRows, ...tabRows].map((y) => ({ page: 1, x1: 50, y1: y, x2: 250, y2: y })),
    vectorShapes: [],
    musicGlyphs: [],
    timeSignature: { beats: 4, beatType: 4 },
    ...overrides,
  };
}

describe('validatePdfFile', () => {
  it('rejects files that are not PDFs', () => {
    const file = { name: 'tab.png', type: 'image/png', size: 1200 } as File;

    expect(() => validatePdfFile(file)).toThrow('Choose a PDF file.');
  });

  it('rejects PDF files larger than 20 MB', () => {
    const file = { name: 'large.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 + 1 } as File;

    expect(() => validatePdfFile(file)).toThrow('PDF files must be 20 MB or smaller.');
  });
});

describe('analyzeTabScore', () => {
  it('extracts the electronic tab score structure without treating fret numbers as measures', () => {
    const measureItems = Array.from({ length: 18 }, (_, index) =>
      textItem(String(index + 1), Math.floor(index / 6) + 1, 80 + (index % 6) * 80, 70 + Math.floor(index / 6) * 190, 8),
    );
    const snapshot: PdfDocumentSnapshot = {
      fileName: 'endless rain.pdf',
      pageCount: 4,
      textItems: [
        textItem('endless\u0001rain', 1, 210, 35, 31),
        textItem('NotePad', 1, 266, 74, 17),
        textItem('=92', 1, 39, 119, 9.52),
        ...measureItems,
        textItem('9', 1, 212, 263, 10),
        textItem('17', 2, 524, 150, 10),
        textItem('3', 2, 502, 86, 8.16),
      ],
      vectorDrawingCount: 1703,
      imageCount: 0,
    };

    expect(analyzeTabScore(snapshot)).toEqual({
      fileName: 'endless rain.pdf',
      pageCount: 4,
      title: 'endless rain',
      tempo: 92,
      beats: 4,
      beatType: 4,
      measureNumbers: Array.from({ length: 18 }, (_, index) => index + 1),
      vectorDrawingCount: 1703,
      tabStaffSystems: [],
      fretPositions: [],
      fretEvents: [],
      rhythmMeasures: Array.from({ length: 18 }, (_, index) => ({
        measureNumber: index + 1,
        status: 'fallback',
        events: [],
        warning: `Measure ${index + 1} has no rhythm events.`,
      })),
      warnings: [
        'Time signature was not detected; 4/4 will be used.',
        'Note recognition is not available yet; exported measures will contain rests.',
      ],
    });
  });

  it('rejects image-only PDFs instead of silently treating them as electronic scores', () => {
    const snapshot: PdfDocumentSnapshot = {
      fileName: 'scan.pdf',
      pageCount: 2,
      textItems: [],
      vectorDrawingCount: 0,
      imageCount: 2,
    };

    expect(() => analyzeTabScore(snapshot)).toThrow('Scanned or image-only PDFs are not supported yet.');
  });

  it('requires a reliable measure sequence before export', () => {
    const snapshot: PdfDocumentSnapshot = {
      fileName: 'unknown.pdf',
      pageCount: 1,
      textItems: [textItem('Untitled', 1, 20, 20, 20)],
      vectorDrawingCount: 40,
      imageCount: 0,
    };

    expect(() => analyzeTabScore(snapshot)).toThrow('No reliable measure sequence was detected.');
  });

  it('reads PDF coordinate rows from top to bottom when finding measure numbers', () => {
    const snapshot: PdfDocumentSnapshot = {
      fileName: 'coordinate-order.pdf',
      pageCount: 1,
      textItems: [
        textItem('Coordinate order', 1, 20, 800, 20),
        textItem('1', 1, 70, 700, 8),
        textItem('2', 1, 170, 700, 8),
        textItem('3', 1, 70, 500, 8),
        textItem('4', 1, 70, 300, 8),
      ],
      vectorDrawingCount: 100,
      imageCount: 0,
    };

    expect(analyzeTabScore(snapshot).measureNumbers).toEqual([1, 2, 3, 4]);
  });

  it('adds reliable string and fret positions without claiming rhythm recognition', () => {
    const stringRows = [100, 110, 120, 130, 140, 150];
    const snapshot: PdfDocumentSnapshot = {
      fileName: 'geometry.pdf',
      pageCount: 1,
      textItems: [
        textItem('Geometry', 1, 20, 30, 20),
        textItem('1', 1, 40, 80, 8),
        textItem('2', 1, 220, 80, 8),
        ...stringRows.map((y, index) => textItem(index === 2 ? '7' : '0', 1, 80, y, 10)),
        ...stringRows.map((y) => textItem('0', 1, 260, y, 10)),
      ],
      vectorDrawingCount: 100,
      imageCount: 0,
      lineSegments: [100, 110, 120, 130, 140, 150].map((y) => ({ page: 1, x1: 50, y1: y, x2: 250, y2: y })),
    };

    const analysis = analyzeTabScore(snapshot);

    expect(analysis.fretPositions).toContainEqual(expect.objectContaining({
      measureNumber: 1,
      stringNumber: 3,
      fret: 7,
      confidence: 'high',
    }));
    expect(analysis.fretEvents).toHaveLength(2);
    expect(analysis.tabStaffSystems).toHaveLength(1);
    expect(analysis.warnings).toContain('Rhythm and technique recognition are not available yet.');
  });

  it('returns one fully recognized measure when path and glyph evidence agree', () => {
    const analysis = analyzeTabScore(rhythmSnapshot({
      vectorShapes: [wholeNoteShape()],
      musicGlyphs: [musicGlyph('note-whole')],
    }));

    expect(analysis.rhythmMeasures[0]).toEqual(expect.objectContaining({
      measureNumber: 1,
      status: 'recognized',
      warning: null,
      events: [expect.objectContaining({
        tabEventOrder: 1,
        duration: 'whole',
        confidence: 'high',
        sourceSymbols: expect.arrayContaining(['open-notehead', 'note-whole']),
      })],
    }));
    expect(analysis.rhythmMeasures[1]).toEqual(expect.objectContaining({
      measureNumber: 2,
      status: 'fallback',
    }));
  });

  it('falls back when strong path and glyph duration evidence conflict', () => {
    const analysis = analyzeTabScore(rhythmSnapshot({
      vectorShapes: quarterNoteShapes(),
      musicGlyphs: [musicGlyph('note-half')],
    }));

    expect(analysis.rhythmMeasures.every((measure) => measure.status === 'fallback')).toBe(true);
    expect(analysis.warnings.some((warning) => warning.includes('conflict'))).toBe(true);
    expect(analysis.warnings).toContain('Note recognition is not available yet; exported measures will contain rests.');
  });

  it('keeps the explicit skeleton warning when only medium-confidence rhythm evidence remains', () => {
    const analysis = analyzeTabScore(rhythmSnapshot({
      musicGlyphs: [
        musicGlyph('note-whole'),
        musicGlyph('augmentation-dot', {
          bounds: { x1: 128, y1: 48, x2: 131, y2: 51 },
          text: '\uE1E7',
        }),
      ],
    }));

    expect(analysis.rhythmMeasures.every((measure) => measure.status === 'fallback')).toBe(true);
    expect(analysis.warnings).toContain('Note recognition is not available yet; exported measures will contain rests.');
  });

  it('bounds repeated internal rhythm diagnostics before exposing them as analysis warnings', () => {
    const analysis = analyzeTabScore(rhythmSnapshot({
      musicGlyphs: Array.from({ length: 8 }, (_, index) => musicGlyph(null, {
        bounds: { x1: 70 + index * 8, y1: 45, x2: 74 + index * 8, y2: 51 },
        text: String.fromCharCode(0xE100 + index),
        mapping: 'unknown',
      })),
    }));

    expect(analysis.warnings.filter((warning) => warning.startsWith('Ignored unknown glyph'))).toHaveLength(5);
    expect(analysis.warnings).toContain('Omitted 3 additional rhythm diagnostics.');
    expect(analysis.warnings.join(' ')).not.toContain(String.fromCharCode(0xE100));
  });

  it('keeps the safe skeleton when no standard staff can be paired with TAB', () => {
    const tabRows = [80, 90, 100, 110, 120, 130];
    const analysis = analyzeTabScore(rhythmSnapshot({
      lineSegments: tabRows.map((y) => ({ page: 1, x1: 50, y1: y, x2: 250, y2: y })),
      musicGlyphs: [musicGlyph('note-whole')],
    }));

    expect(analysis.rhythmMeasures.every((measure) => measure.status === 'fallback')).toBe(true);
    expect(analysis.warnings).toContain('Note recognition is not available yet; exported measures will contain rests.');
  });

  it('recognizes path-only rhythm evidence', () => {
    const analysis = analyzeTabScore(rhythmSnapshot({
      vectorShapes: [wholeNoteShape()],
      musicGlyphs: [],
    }));

    expect(analysis.rhythmMeasures[0]).toEqual(expect.objectContaining({
      status: 'recognized',
      events: [expect.objectContaining({ duration: 'whole' })],
    }));
  });

  it('recognizes glyph-only rhythm evidence', () => {
    const analysis = analyzeTabScore(rhythmSnapshot({
      vectorShapes: [],
      musicGlyphs: [musicGlyph('note-whole')],
    }));

    expect(analysis.rhythmMeasures[0]).toEqual(expect.objectContaining({
      status: 'recognized',
      events: [expect.objectContaining({ duration: 'whole' })],
    }));
  });

  it('keeps snapshots without optional rhythm evidence fields backward compatible', () => {
    const snapshot = rhythmSnapshot();
    delete snapshot.lineSegments;
    delete snapshot.vectorShapes;
    delete snapshot.musicGlyphs;

    const analysis = analyzeTabScore(snapshot);

    expect(analysis.rhythmMeasures).toHaveLength(2);
    expect(analysis.rhythmMeasures.every((measure) => measure.status === 'fallback')).toBe(true);
    expect(analysis.warnings).toContain('Note recognition is not available yet; exported measures will contain rests.');
  });
});
