import { describe, expect, it } from 'vitest';
import { readPdfSnapshot, type PdfJsLoader } from './pdf.service';

const file = {
  name: 'endless rain.pdf',
  type: 'application/pdf',
  size: 8,
  arrayBuffer: async () => new ArrayBuffer(8),
} as File;

describe('readPdfSnapshot', () => {
  it('normalizes PDF.js pages, text and vector drawings, then releases the document', async () => {
    let destroyed = false;
    const loader: PdfJsLoader = async () => ({
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 2,
          destroy: () => {
            destroyed = true;
          },
          getPage: async (pageNumber: number) => ({
            getTextContent: async () => ({
              items: pageNumber === 1
                ? [
                  { str: 'endless rain', transform: [10, 0, 0, 12, 30, 80], width: 72, height: 12 },
                  { str: '4/4', transform: [10, 0, 0, 12, 120, 80], width: 24, height: 12 },
                ]
                : [{ str: '=92', transform: [10, 0, 0, 12, 30, 80], width: 72, height: 12 }],
            }),
            getOperatorList: async () => ({
              fnArray: [1, 2, 3, 4, 10],
              argsArray: [[], [], [], [], [[1, 2], [50, 100, 250, 100]]],
            }),
            getAnnotations: async () => pageNumber === 1 ? [{ subtype: 'Image' }] : [],
          }),
        }),
      }),
      OPS: { constructPath: 10, moveTo: 1, lineTo: 2 },
    });

    await expect(readPdfSnapshot(file, loader)).resolves.toEqual({
      fileName: 'endless rain.pdf',
      pageCount: 2,
      textItems: [
        { text: 'endless rain', page: 1, x: 30, y: 80, width: 72, height: 12, fontSize: 12 },
        { text: '4/4', page: 1, x: 120, y: 80, width: 24, height: 12, fontSize: 12 },
        { text: '=92', page: 2, x: 30, y: 80, width: 72, height: 12, fontSize: 12 },
      ],
      vectorDrawingCount: 10,
      imageCount: 1,
      lineSegments: [
        { page: 1, x1: 50, y1: 100, x2: 250, y2: 100 },
        { page: 2, x1: 50, y1: 100, x2: 250, y2: 100 },
      ],
      vectorShapes: [],
      musicGlyphs: [],
      timeSignature: { beats: 4, beatType: 4 },
    });
    expect(destroyed).toBe(true);
  });

  it('rejects PDFs longer than 20 pages before reading their content', async () => {
    const loader: PdfJsLoader = async () => ({
      getDocument: () => ({
        promise: Promise.resolve({ numPages: 21, destroy: () => undefined, getPage: async () => { throw new Error('not reached'); } }),
      }),
    });

    await expect(readPdfSnapshot(file, loader)).rejects.toThrow('PDFs with more than 20 pages are not supported.');
  });

  it('applies PDF graphics transforms before returning path line segments', async () => {
    const loader: PdfJsLoader = async () => ({
      OPS: { constructPath: 10, lineTo: 2, moveTo: 1, restore: 12, save: 11, transform: 13 },
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          destroy: () => undefined,
          getPage: async () => ({
            getAnnotations: async () => [],
            getOperatorList: async () => ({
              fnArray: [11, 13, 10, 12],
              argsArray: [[], [2, 0, 0, 2, 10, 20], [[1, 2], [5, 6, 20, 6]], []],
            }),
            getTextContent: async () => ({ items: [] }),
          }),
        }),
      }),
    });

    await expect(readPdfSnapshot(file, loader)).resolves.toMatchObject({
      lineSegments: [{ page: 1, x1: 20, y1: 32, x2: 50, y2: 32 }],
    });
  });

  it('preserves compound painted shapes with graphics state and discards unpainted paths', async () => {
    let destroyed = false;
    const ops = {
      closePath: 4,
      constructPath: 10,
      curveTo: 3,
      endPath: 24,
      eoFill: 21,
      fill: 20,
      fillStroke: 23,
      lineTo: 2,
      moveTo: 1,
      rectangle: 5,
      restore: 12,
      save: 11,
      setLineWidth: 14,
      stroke: 22,
      transform: 13,
    };
    const loader: PdfJsLoader = async () => ({
      OPS: ops,
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          destroy: () => {
            destroyed = true;
          },
          getPage: async () => ({
            getAnnotations: async () => [],
            getOperatorList: async () => ({
              fnArray: [
                ops.save,
                ops.transform,
                ops.setLineWidth,
                ops.constructPath,
                ops.constructPath,
                ops.eoFill,
                ops.restore,
                ops.constructPath,
                ops.fill,
                ops.setLineWidth,
                ops.constructPath,
                ops.stroke,
                ops.save,
                ops.setLineWidth,
                ops.constructPath,
                ops.fillStroke,
                ops.restore,
                ops.constructPath,
                ops.stroke,
                ops.constructPath,
                ops.endPath,
              ],
              argsArray: [
                [],
                [2, 0, 0, 2, 10, 20],
                [3],
                [[ops.moveTo, ops.curveTo, ops.closePath], [0, 0, 5, 0, 5, 5, 0, 5]],
                [[ops.moveTo, ops.curveTo, ops.closePath], [10, 0, 15, 0, 15, 5, 10, 5]],
                [],
                [],
                [[ops.rectangle], [30, 40, 20, 10]],
                [],
                [5],
                [[ops.moveTo, ops.lineTo], [0, 60, 20, 60]],
                [],
                [],
                [7],
                [[ops.moveTo, ops.curveTo], [0, 70, 5, 75, 15, 75, 20, 70]],
                [],
                [],
                [[ops.moveTo, ops.lineTo], [0, 80, 20, 80]],
                [],
                [[ops.moveTo, ops.lineTo], [0, 90, 20, 90]],
                [],
              ],
            }),
            getTextContent: async () => ({ items: [] }),
          }),
        }),
      }),
    });

    const snapshot = await readPdfSnapshot(file, loader);

    expect(snapshot.vectorShapes).toEqual([
      {
        page: 1,
        paint: 'fill',
        fillRule: 'evenodd',
        strokeWidth: null,
        subpaths: [
          {
            commands: [
              { type: 'move', x: 10, y: 20 },
              { type: 'curve', x1: 20, y1: 20, x2: 20, y2: 30, x: 10, y: 30 },
            ],
            closed: true,
          },
          {
            commands: [
              { type: 'move', x: 30, y: 20 },
              { type: 'curve', x1: 40, y1: 20, x2: 40, y2: 30, x: 30, y: 30 },
            ],
            closed: true,
          },
        ],
        bounds: { x1: 10, y1: 20, x2: 40, y2: 30 },
      },
      {
        page: 1,
        paint: 'fill',
        fillRule: 'nonzero',
        strokeWidth: null,
        subpaths: [{
          commands: [
            { type: 'move', x: 30, y: 40 },
            { type: 'line', x: 50, y: 40 },
            { type: 'line', x: 50, y: 50 },
            { type: 'line', x: 30, y: 50 },
          ],
          closed: true,
        }],
        bounds: { x1: 30, y1: 40, x2: 50, y2: 50 },
      },
      expect.objectContaining({
        paint: 'stroke',
        strokeWidth: 5,
        bounds: { x1: 0, y1: 60, x2: 20, y2: 60 },
      }),
      expect.objectContaining({
        paint: 'fill-stroke',
        strokeWidth: 7,
        bounds: { x1: 0, y1: 70, x2: 20, y2: 75 },
      }),
      expect.objectContaining({
        paint: 'stroke',
        strokeWidth: 5,
        bounds: { x1: 0, y1: 80, x2: 20, y2: 80 },
      }),
    ]);
    expect(snapshot.lineSegments).toEqual([
      { page: 1, x1: 0, y1: 60, x2: 20, y2: 60 },
      { page: 1, x1: 0, y1: 80, x2: 20, y2: 80 },
      { page: 1, x1: 0, y1: 90, x2: 20, y2: 90 },
    ]);
    expect(destroyed).toBe(true);
  });

  it('maps only allowlisted SMuFL glyphs and preserves other private-use characters as unknown', async () => {
    const loader: PdfJsLoader = async () => ({
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          destroy: () => undefined,
          getPage: async () => ({
            getAnnotations: async () => [],
            getOperatorList: async () => ({ fnArray: [], argsArray: [] }),
            getTextContent: async () => ({
              items: [
                { str: '\uE0A4', fontName: 'music-font', transform: [10, 0, 0, 12, 30, 80], width: 10, height: 12 },
                { str: '\uE099', fontName: 'music-font', transform: [10, 0, 0, 12, 50, 80], width: 10, height: 12 },
                { str: '\uE0A3', fontName: 'lookalike-font', transform: [10, 0, 0, 12, 70, 80], width: 10, height: 12 },
                { str: 'verse', fontName: 'music-font', transform: [10, 0, 0, 12, 90, 80], width: 30, height: 12 },
              ],
              styles: {
                'music-font': { fontFamily: '  BRAVURA  ' },
                'lookalike-font': { fontFamily: 'Bravura Text' },
              },
            }),
          }),
        }),
      }),
    });

    const snapshot = await readPdfSnapshot(file, loader);

    expect(snapshot.musicGlyphs).toEqual([
      {
        page: 1,
        bounds: { x1: 30, y1: 80, x2: 40, y2: 92 },
        fontName: 'music-font',
        fontFamily: '  BRAVURA  ',
        text: '\uE0A4',
        semantic: 'notehead-filled',
        mapping: 'reliable',
      },
      expect.objectContaining({
        text: '\uE099',
        semantic: null,
        mapping: 'unknown',
      }),
      expect.objectContaining({
        fontFamily: 'Bravura Text',
        text: '\uE0A3',
        semantic: null,
        mapping: 'unknown',
      }),
    ]);
    expect(snapshot.textItems).toContainEqual(expect.objectContaining({
      text: '\uE0A4',
      fontName: 'music-font',
      fontFamily: '  BRAVURA  ',
    }));
    expect(snapshot.musicGlyphs).not.toContainEqual(expect.objectContaining({ text: 'verse' }));
  });
});
