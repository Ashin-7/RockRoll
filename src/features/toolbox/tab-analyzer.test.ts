import { describe, expect, it } from 'vitest';
import { analyzeTabScore, validatePdfFile } from './tab-analyzer';
import { PdfDocumentSnapshot, PdfTextItem, PdfVectorPath } from './toolbox.types';

function textItem(text: string, page: number, x: number, y: number, fontSize: number): PdfTextItem {
  return { text, page, x, y, width: text.length * fontSize, height: fontSize, fontSize };
}

function horizontalLine(y: number) {
  return { page: 1, x1: 20, y1: y, x2: 220, y2: y };
}

function closedPath(
  paint: PdfVectorPath['paint'],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): PdfVectorPath {
  return {
    page: 1,
    paint,
    bounds: { x1, y1, x2, y2 },
    commands: [
      { type: 'move', x: x1, y: y1 },
      { type: 'line', x: x2, y: y1 },
      { type: 'line', x: x2, y: y2 },
      { type: 'line', x: x1, y: y2 },
      { type: 'close' },
    ],
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
      rhythmMeasures: [],
      warnings: [
        'Time signature was not detected; 4/4 will be used.',
        'Note recognition is not available yet; exported measures will contain rests.',
        'Rhythm and technique recognition are not available yet.',
        'No reliable paired staff was detected; exported measures will use the safe rest skeleton.',
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
    expect(analysis.warnings).toContain(
      'No reliable paired staff was detected; exported measures will use the safe rest skeleton.',
    );
    expect(analysis.rhythmMeasures).toEqual([]);
  });

  it('recognizes complete measures and falls back for missing or conflicting rhythm symbols', () => {
    const snapshot: PdfDocumentSnapshot = {
      fileName: 'explicit-rhythm.pdf',
      pageCount: 1,
      textItems: [
        textItem('Explicit rhythm', 1, 20, 20, 20),
        textItem('1', 1, 30, 25, 8),
        textItem('2', 1, 150, 25, 8),
        textItem('3', 1, 60, 110, 10),
        textItem('5', 1, 180, 110, 10),
      ],
      vectorDrawingCount: 20,
      imageCount: 0,
      lineSegments: [
        ...[40, 50, 60, 70, 80].map(horizontalLine),
        ...[110, 120, 130, 140, 150, 160].map(horizontalLine),
      ],
      vectorPaths: [
        closedPath('stroke', 55, 55, 65, 63),
        closedPath('fill', 175, 55, 185, 63),
      ],
      timeSignature: { beats: 4, beatType: 4 },
    };

    const analysis = analyzeTabScore(snapshot);

    expect(analysis.rhythmMeasures).toEqual([
      expect.objectContaining({ measureNumber: 1, status: 'recognized' }),
      expect.objectContaining({ measureNumber: 2, status: 'fallback' }),
    ]);
    expect(analysis.warnings).toContain(
      'Measure 2 rhythm could not be confirmed; safe export fallback will be used.',
    );
    expect(analysis.warnings).not.toContain('Rhythm and technique recognition are not available yet.');
    expect(analysis.warnings).not.toContain(
      'No reliable paired staff was detected; exported measures will use the safe rest skeleton.',
    );
  });

  it('keeps safe skeleton semantics when vector paths are unavailable', () => {
    const snapshot: PdfDocumentSnapshot = {
      fileName: 'no-vector-paths.pdf',
      pageCount: 1,
      textItems: [
        textItem('No paths', 1, 20, 20, 20),
        textItem('1', 1, 30, 25, 8),
        textItem('2', 1, 150, 25, 8),
        textItem('3', 1, 60, 110, 10),
        textItem('5', 1, 180, 110, 10),
      ],
      vectorDrawingCount: 20,
      imageCount: 0,
      lineSegments: [
        ...[40, 50, 60, 70, 80].map(horizontalLine),
        ...[110, 120, 130, 140, 150, 160].map(horizontalLine),
      ],
    };

    const analysis = analyzeTabScore(snapshot);

    expect(analysis.rhythmMeasures).toEqual([]);
    expect(analysis.warnings).toContain(
      'Rhythm vector paths were unavailable; exported measures will use the safe rest skeleton.',
    );
    expect(analysis.warnings).toContain('Rhythm and technique recognition are not available yet.');
  });
});
