import type { PdfDocumentSnapshot, PdfLineSegment, PdfTextItem, PdfVectorCommand, PdfVectorPath } from './toolbox.types';
import { validatePdfFile } from './tab-analyzer';

const MAX_PDF_PAGES = 20;

interface PdfTextContentItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

interface PdfPageProxy {
  getAnnotations(): Promise<Array<{ subtype?: string }>>;
  getOperatorList(): Promise<{ argsArray?: unknown[][]; fnArray: number[] }>;
  getTextContent(): Promise<{ items: PdfTextContentItem[] }>;
}

interface PdfDocumentProxy {
  destroy(): void;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  numPages: number;
}

interface PdfJsModule {
  GlobalWorkerOptions?: { workerSrc: string };
  OPS?: Record<string, number>;
  getDocument(source: { data: ArrayBuffer }): { promise: Promise<PdfDocumentProxy> };
}

export type PdfJsLoader = () => Promise<PdfJsModule>;

function getDefaultPdfJsLoader(): Promise<PdfJsModule> {
  return import('pdfjs-dist') as Promise<PdfJsModule>;
}

function configurePdfWorker(pdfjs: PdfJsModule): void {
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
}

function isImageOperator(operator: number, ops?: Record<string, number>): boolean {
  if (!ops) {
    return false;
  }

  return [ops.paintImageXObject, ops.paintImageXObjectRepeat, ops.paintJpegXObject, ops.paintImageMaskXObject, ops.paintSolidColorImageMask]
    .filter((value): value is number => typeof value === 'number')
    .includes(operator);
}

type PdfTransform = [number, number, number, number, number, number];

function combineTransforms(left: PdfTransform, right: PdfTransform): PdfTransform {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function applyTransform(x: number, y: number, transform: PdfTransform): { x: number; y: number } {
  return {
    x: transform[0] * x + transform[2] * y + transform[4],
    y: transform[1] * x + transform[3] * y + transform[5],
  };
}

function getTransform(values: unknown[] | undefined): PdfTransform | null {
  if (!values || values.length !== 6 || values.some((value) => typeof value !== 'number')) {
    return null;
  }

  return values as PdfTransform;
}

function getPathCoordinateCount(command: number, ops: Record<string, number>): number {
  if (command === ops.moveTo || command === ops.lineTo) {
    return 2;
  }
  if (command === ops.curveTo) {
    return 6;
  }
  if (command === ops.curveTo2 || command === ops.curveTo3) {
    return 4;
  }
  if (command === ops.rectangle) {
    return 4;
  }

  return 0;
}

function extractLineSegments(
  fnArray: number[],
  argsArray: unknown[][] | undefined,
  page: number,
  ops?: Record<string, number>,
): PdfLineSegment[] {
  const constructPath = ops?.constructPath;
  const moveTo = ops?.moveTo;
  const lineTo = ops?.lineTo;
  const save = ops?.save;
  const restore = ops?.restore;
  const transform = ops?.transform;
  if (!ops || typeof constructPath !== 'number' || typeof moveTo !== 'number' || typeof lineTo !== 'number') {
    return [];
  }

  const segments: PdfLineSegment[] = [];
  let currentTransform: PdfTransform = [1, 0, 0, 1, 0, 0];
  const transformStack: PdfTransform[] = [];
  fnArray.forEach((operator, index) => {
    if (operator === save) {
      transformStack.push([...currentTransform] as PdfTransform);
      return;
    }
    if (operator === restore) {
      currentTransform = transformStack.pop() ?? currentTransform;
      return;
    }
    if (operator === transform) {
      const nextTransform = getTransform(argsArray?.[index]);
      if (nextTransform) {
        currentTransform = combineTransforms(currentTransform, nextTransform);
      }
      return;
    }
    if (operator !== constructPath) {
      return;
    }

    const pathArguments = argsArray?.[index];
    const commands = pathArguments?.[0];
    const coordinates = pathArguments?.[1];
    if (!Array.isArray(commands) || !Array.isArray(coordinates)) {
      return;
    }

    let coordinateIndex = 0;
    let currentPoint: { x: number; y: number } | null = null;
    commands.forEach((command) => {
      const x = coordinates[coordinateIndex];
      const y = coordinates[coordinateIndex + 1];
      coordinateIndex += getPathCoordinateCount(command, ops);
      if (typeof x !== 'number' || typeof y !== 'number') {
        currentPoint = null;
        return;
      }

      if (command === moveTo) {
        currentPoint = applyTransform(x, y, currentTransform);
      } else if (command === lineTo && currentPoint) {
        const nextPoint = applyTransform(x, y, currentTransform);
        segments.push({ page, x1: currentPoint.x, y1: currentPoint.y, x2: nextPoint.x, y2: nextPoint.y });
        currentPoint = nextPoint;
      }
    });
  });

  return segments;
}

function getPaintMode(operator: number, ops: Record<string, number>): PdfVectorPath['paint'] | null {
  if (operator === ops.fill || operator === ops.eoFill) return 'fill';
  if (operator === ops.stroke) return 'stroke';
  if (operator === ops.fillStroke || operator === ops.eoFillStroke) return 'fill-stroke';
  return null;
}

function getVectorPathBounds(commands: PdfVectorCommand[]): PdfVectorPath['bounds'] | null {
  const points: Array<{ x: number; y: number }> = [];
  commands.forEach((command) => {
    if (command.type === 'move' || command.type === 'line') {
      points.push({ x: command.x, y: command.y });
    } else if (command.type === 'curve') {
      points.push(
        { x: command.x1, y: command.y1 },
        { x: command.x2, y: command.y2 },
        { x: command.x, y: command.y },
      );
    }
  });
  if (points.length === 0) {
    return null;
  }

  return {
    x1: Math.min(...points.map((point) => point.x)),
    y1: Math.min(...points.map((point) => point.y)),
    x2: Math.max(...points.map((point) => point.x)),
    y2: Math.max(...points.map((point) => point.y)),
  };
}

function extractVectorPaths(
  fnArray: number[],
  argsArray: unknown[][] | undefined,
  page: number,
  ops?: Record<string, number>,
): PdfVectorPath[] {
  if (!ops || typeof ops.constructPath !== 'number') {
    return [];
  }

  const paths: PdfVectorPath[] = [];
  let currentTransform: PdfTransform = [1, 0, 0, 1, 0, 0];
  const transformStack: PdfTransform[] = [];
  let pendingCommands: PdfVectorCommand[] = [];
  let currentPoint: { x: number; y: number } | null = null;

  fnArray.forEach((operator, index) => {
    if (operator === ops.save) {
      transformStack.push([...currentTransform] as PdfTransform);
      return;
    }
    if (operator === ops.restore) {
      currentTransform = transformStack.pop() ?? currentTransform;
      return;
    }
    if (operator === ops.transform) {
      const nextTransform = getTransform(argsArray?.[index]);
      if (nextTransform) {
        currentTransform = combineTransforms(currentTransform, nextTransform);
      }
      return;
    }
    if (operator === ops.endPath) {
      pendingCommands = [];
      currentPoint = null;
      return;
    }

    const paint = getPaintMode(operator, ops);
    if (paint) {
      const bounds = getVectorPathBounds(pendingCommands);
      if (bounds) {
        paths.push({ page, paint, commands: pendingCommands, bounds });
      }
      pendingCommands = [];
      currentPoint = null;
      return;
    }
    if (operator !== ops.constructPath) {
      return;
    }

    const pathArguments = argsArray?.[index];
    const commands = pathArguments?.[0];
    const coordinates = pathArguments?.[1];
    if (!Array.isArray(commands) || !Array.isArray(coordinates)) {
      return;
    }

    let coordinateIndex = 0;
    commands.forEach((command) => {
      const coordinateCount = getPathCoordinateCount(command, ops);
      const values = coordinates.slice(coordinateIndex, coordinateIndex + coordinateCount);
      coordinateIndex += coordinateCount;
      if (values.some((value) => typeof value !== 'number')) {
        currentPoint = null;
        return;
      }
      const numbers = values as number[];

      if (command === ops.moveTo || command === ops.lineTo) {
        const point = applyTransform(numbers[0], numbers[1], currentTransform);
        pendingCommands.push({ type: command === ops.moveTo ? 'move' : 'line', ...point });
        currentPoint = point;
      } else if (command === ops.curveTo) {
        const first = applyTransform(numbers[0], numbers[1], currentTransform);
        const second = applyTransform(numbers[2], numbers[3], currentTransform);
        const end = applyTransform(numbers[4], numbers[5], currentTransform);
        pendingCommands.push({ type: 'curve', x1: first.x, y1: first.y, x2: second.x, y2: second.y, x: end.x, y: end.y });
        currentPoint = end;
      } else if (command === ops.curveTo2 && currentPoint) {
        const second = applyTransform(numbers[0], numbers[1], currentTransform);
        const end = applyTransform(numbers[2], numbers[3], currentTransform);
        pendingCommands.push({ type: 'curve', x1: currentPoint.x, y1: currentPoint.y, x2: second.x, y2: second.y, x: end.x, y: end.y });
        currentPoint = end;
      } else if (command === ops.curveTo3) {
        const first = applyTransform(numbers[0], numbers[1], currentTransform);
        const end = applyTransform(numbers[2], numbers[3], currentTransform);
        pendingCommands.push({ type: 'curve', x1: first.x, y1: first.y, x2: end.x, y2: end.y, x: end.x, y: end.y });
        currentPoint = end;
      } else if (command === ops.closePath) {
        pendingCommands.push({ type: 'close' });
      }
    });
  });

  return paths;
}

function normalizeTextItems(items: PdfTextContentItem[], page: number): PdfTextItem[] {
  return items
    .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0)
    .map((item) => {
      const transform = item.transform ?? [0, 0, 0, 0, 0, 0];

      return {
        text: item.str!.trim(),
        page,
        x: transform[4] ?? 0,
        y: transform[5] ?? 0,
        width: item.width ?? 0,
        height: item.height ?? Math.abs(transform[3] ?? 0),
        fontSize: Math.abs(transform[3] ?? item.height ?? 0),
      };
    });
}

function findTimeSignature(textItems: PdfTextItem[]): PdfDocumentSnapshot['timeSignature'] {
  for (const item of textItems) {
    const match = item.text.replace(/\s+/g, '').match(/^(\d{1,2})\/(\d{1,2})$/);
    if (match) {
      return { beats: Number(match[1]), beatType: Number(match[2]) };
    }
  }

  return undefined;
}

export async function readPdfSnapshot(file: File, loadPdfJs: PdfJsLoader = getDefaultPdfJsLoader): Promise<PdfDocumentSnapshot> {
  validatePdfFile(file);
  const pdfjs = await loadPdfJs();
  configurePdfWorker(pdfjs);
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

  try {
    if (document.numPages > MAX_PDF_PAGES) {
      throw new Error('PDFs with more than 20 pages are not supported.');
    }

    const textItems: PdfTextItem[] = [];
    const lineSegments: PdfLineSegment[] = [];
    const vectorPaths: PdfVectorPath[] = [];
    let vectorDrawingCount = 0;
    let imageCount = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const [textContent, operatorList, annotations] = await Promise.all([
        page.getTextContent(),
        page.getOperatorList(),
        page.getAnnotations(),
      ]);
      textItems.push(...normalizeTextItems(textContent.items, pageNumber));
      lineSegments.push(...extractLineSegments(operatorList.fnArray, operatorList.argsArray, pageNumber, pdfjs.OPS));
      vectorPaths.push(...extractVectorPaths(operatorList.fnArray, operatorList.argsArray, pageNumber, pdfjs.OPS));
      imageCount += annotations.filter((annotation) => annotation.subtype === 'Image').length;
      operatorList.fnArray.forEach((operator) => {
        if (isImageOperator(operator, pdfjs.OPS)) {
          imageCount += 1;
        } else {
          vectorDrawingCount += 1;
        }
      });
    }

    return {
      fileName: file.name,
      pageCount: document.numPages,
      textItems,
      vectorDrawingCount,
      imageCount,
      lineSegments,
      ...(vectorPaths.length > 0 ? { vectorPaths } : {}),
      timeSignature: findTimeSignature(textItems),
    };
  } finally {
    document.destroy();
  }
}
