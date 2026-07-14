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

  it('preserves transformed filled vector paths until their paint operator', async () => {
    const loader: PdfJsLoader = async () => ({
      OPS: {
        closePath: 4,
        constructPath: 10,
        curveTo: 3,
        fill: 14,
        moveTo: 1,
        restore: 12,
        save: 11,
        stroke: 15,
        transform: 13,
      },
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          destroy: () => undefined,
          getPage: async () => ({
            getAnnotations: async () => [],
            getOperatorList: async () => ({
              fnArray: [11, 13, 10, 14, 15, 12],
              argsArray: [
                [],
                [2, 0, 0, 2, 10, 20],
                [[1, 3, 4], [5, 6, 7, 4, 12, 4, 14, 6]],
                [],
                [],
                [],
              ],
            }),
            getTextContent: async () => ({ items: [] }),
          }),
        }),
      }),
    });

    const snapshot = await readPdfSnapshot(file, loader);

    expect(snapshot.vectorPaths).toEqual([
      {
        page: 1,
        paint: 'fill',
        commands: [
          { type: 'move', x: 20, y: 32 },
          { type: 'curve', x1: 24, y1: 28, x2: 34, y2: 28, x: 38, y: 32 },
          { type: 'close' },
        ],
        bounds: { x1: 20, y1: 28, x2: 38, y2: 32 },
      },
    ]);
  });

  it('expands transformed rectangles into a single stroked closed path', async () => {
    const loader: PdfJsLoader = async () => ({
      OPS: {
        constructPath: 10,
        rectangle: 5,
        stroke: 15,
        transform: 13,
      },
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          destroy: () => undefined,
          getPage: async () => ({
            getAnnotations: async () => [],
            getOperatorList: async () => ({
              fnArray: [13, 10, 15, 15],
              argsArray: [
                [2, 0, 0, 3, 10, 20],
                [[5], [4, 5, 6, 7]],
                [],
                [],
              ],
            }),
            getTextContent: async () => ({ items: [] }),
          }),
        }),
      }),
    });

    const snapshot = await readPdfSnapshot(file, loader);

    expect(snapshot.vectorPaths).toEqual([
      {
        page: 1,
        paint: 'stroke',
        commands: [
          { type: 'move', x: 18, y: 35 },
          { type: 'line', x: 30, y: 35 },
          { type: 'line', x: 30, y: 56 },
          { type: 'line', x: 18, y: 56 },
          { type: 'close' },
        ],
        bounds: { x1: 18, y1: 35, x2: 30, y2: 56 },
      },
    ]);
  });

  it('restores the subpath start before a shorthand curve after close', async () => {
    const loader: PdfJsLoader = async () => ({
      OPS: {
        closePath: 4,
        constructPath: 10,
        curveTo2: 6,
        fill: 14,
        lineTo: 2,
        moveTo: 1,
      },
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          destroy: () => undefined,
          getPage: async () => ({
            getAnnotations: async () => [],
            getOperatorList: async () => ({
              fnArray: [10, 14],
              argsArray: [
                [[1, 2, 4, 6], [2, 3, 8, 9, 12, 13, 14, 15]],
                [],
              ],
            }),
            getTextContent: async () => ({ items: [] }),
          }),
        }),
      }),
    });

    const snapshot = await readPdfSnapshot(file, loader);

    expect(snapshot.vectorPaths?.[0].commands).toEqual([
      { type: 'move', x: 2, y: 3 },
      { type: 'line', x: 8, y: 9 },
      { type: 'close' },
      { type: 'curve', x1: 2, y1: 3, x2: 12, y2: 13, x: 14, y: 15 },
    ]);
  });

  it('discards an unpainted path on endPath', async () => {
    const loader: PdfJsLoader = async () => ({
      OPS: {
        constructPath: 10,
        endPath: 16,
        lineTo: 2,
        moveTo: 1,
        stroke: 15,
      },
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          destroy: () => undefined,
          getPage: async () => ({
            getAnnotations: async () => [],
            getOperatorList: async () => ({
              fnArray: [10, 16, 15],
              argsArray: [
                [[1, 2], [1, 2, 3, 4]],
                [],
                [],
              ],
            }),
            getTextContent: async () => ({ items: [] }),
          }),
        }),
      }),
    });

    await expect(readPdfSnapshot(file, loader)).resolves.not.toHaveProperty('vectorPaths');
  });
});
