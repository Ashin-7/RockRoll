import type {
  MusicGlyphSemantic,
  PdfBounds,
  PdfDocumentSnapshot,
  PdfLineSegment,
  PdfMusicGlyphEvidence,
  PdfPaintedShape,
  PdfTextItem,
  PdfVectorCommand,
  PdfVectorSubpath,
} from './toolbox.types';
import { validatePdfFile } from './tab-analyzer';

const MAX_PDF_PAGES = 20;

const SMUFL_FAMILIES = new Set([
  'bravura',
  'finale maestro',
  'leland',
  'musejazz',
  'november2',
  'petaluma',
]);

const SMUFL_SEMANTICS: Record<string, MusicGlyphSemantic> = {
  '\uE0A2': 'notehead-whole',
  '\uE0A3': 'notehead-half',
  '\uE0A4': 'notehead-filled',
  '\uE1D2': 'note-whole',
  '\uE1D3': 'note-half',
  '\uE1D4': 'note-half',
  '\uE1D5': 'note-quarter',
  '\uE1D6': 'note-quarter',
  '\uE1D7': 'note-eighth',
  '\uE1D8': 'note-eighth',
  '\uE1D9': 'note-16th',
  '\uE1DA': 'note-16th',
  '\uE1E7': 'augmentation-dot',
  '\uE240': 'flag-eighth',
  '\uE241': 'flag-eighth',
  '\uE242': 'flag-16th',
  '\uE243': 'flag-16th',
  '\uE4E3': 'rest-whole',
  '\uE4E4': 'rest-half',
  '\uE4E5': 'rest-quarter',
  '\uE4E6': 'rest-eighth',
  '\uE4E7': 'rest-16th',
};

interface PdfTextContentItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
}

interface PdfTextContentStyle {
  fontFamily?: string;
}

interface PdfPageProxy {
  getAnnotations(): Promise<Array<{ subtype?: string }>>;
  getOperatorList(): Promise<{ argsArray?: unknown[][]; fnArray: number[] }>;
  getTextContent(): Promise<{ items: PdfTextContentItem[]; styles?: Record<string, PdfTextContentStyle> }>;
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

function extractVectorSubpaths(
  commands: unknown[],
  coordinates: unknown[],
  transform: PdfTransform,
  ops: Record<string, number>,
): PdfVectorSubpath[] {
  const subpaths: PdfVectorSubpath[] = [];
  let coordinateIndex = 0;
  let currentSubpath: PdfVectorSubpath | null = null;
  let currentPoint: { x: number; y: number } | null = null;

  const finishCurrentSubpath = (): void => {
    if (currentSubpath && currentSubpath.commands.length > 0) {
      subpaths.push(currentSubpath);
    }
    currentSubpath = null;
    currentPoint = null;
  };

  commands.forEach((command) => {
    if (typeof command !== 'number') {
      return;
    }

    const coordinateCount = getPathCoordinateCount(command, ops);
    const values = coordinates.slice(coordinateIndex, coordinateIndex + coordinateCount);
    coordinateIndex += coordinateCount;
    if (values.some((value) => typeof value !== 'number')) {
      return;
    }
    const numericValues = values as number[];

    if (command === ops.moveTo) {
      finishCurrentSubpath();
      currentPoint = applyTransform(numericValues[0], numericValues[1], transform);
      currentSubpath = {
        commands: [{ type: 'move', ...currentPoint }],
        closed: false,
      };
      return;
    }

    if (command === ops.rectangle) {
      finishCurrentSubpath();
      const [x, y, width, height] = numericValues;
      const corners = [
        applyTransform(x, y, transform),
        applyTransform(x + width, y, transform),
        applyTransform(x + width, y + height, transform),
        applyTransform(x, y + height, transform),
      ];
      subpaths.push({
        commands: [
          { type: 'move', ...corners[0] },
          { type: 'line', ...corners[1] },
          { type: 'line', ...corners[2] },
          { type: 'line', ...corners[3] },
        ],
        closed: true,
      });
      return;
    }

    if (command === ops.closePath) {
      if (currentSubpath) {
        currentSubpath.closed = true;
        const start = currentSubpath.commands[0];
        currentPoint = { x: start.x, y: start.y };
      }
      return;
    }

    if (!currentSubpath || !currentPoint) {
      return;
    }

    if (command === ops.lineTo) {
      currentPoint = applyTransform(numericValues[0], numericValues[1], transform);
      currentSubpath.commands.push({ type: 'line', ...currentPoint });
      return;
    }

    let curve: Extract<PdfVectorCommand, { type: 'curve' }> | null = null;
    if (command === ops.curveTo) {
      const firstControl = applyTransform(numericValues[0], numericValues[1], transform);
      const secondControl = applyTransform(numericValues[2], numericValues[3], transform);
      const end = applyTransform(numericValues[4], numericValues[5], transform);
      curve = { type: 'curve', x1: firstControl.x, y1: firstControl.y, x2: secondControl.x, y2: secondControl.y, ...end };
    } else if (command === ops.curveTo2) {
      const secondControl = applyTransform(numericValues[0], numericValues[1], transform);
      const end = applyTransform(numericValues[2], numericValues[3], transform);
      curve = { type: 'curve', x1: currentPoint.x, y1: currentPoint.y, x2: secondControl.x, y2: secondControl.y, ...end };
    } else if (command === ops.curveTo3) {
      const firstControl = applyTransform(numericValues[0], numericValues[1], transform);
      const end = applyTransform(numericValues[2], numericValues[3], transform);
      curve = { type: 'curve', x1: firstControl.x, y1: firstControl.y, x2: end.x, y2: end.y, ...end };
    }

    if (curve) {
      currentSubpath.commands.push(curve);
      currentPoint = { x: curve.x, y: curve.y };
    }
  });

  finishCurrentSubpath();
  return subpaths;
}

function getSubpathBounds(subpaths: PdfVectorSubpath[]): PdfBounds | null {
  const points = subpaths.flatMap((subpath) => subpath.commands.flatMap((command) => {
    if (command.type === 'curve') {
      return [
        { x: command.x1, y: command.y1 },
        { x: command.x2, y: command.y2 },
        { x: command.x, y: command.y },
      ];
    }
    return [{ x: command.x, y: command.y }];
  }));
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

interface PaintOperation {
  paint: PdfPaintedShape['paint'];
  fillRule: PdfPaintedShape['fillRule'];
  closesPath: boolean;
}

function getPaintOperation(operator: number, ops: Record<string, number>): PaintOperation | null {
  if (operator === ops.fill) {
    return { paint: 'fill', fillRule: 'nonzero', closesPath: false };
  }
  if (operator === ops.eoFill) {
    return { paint: 'fill', fillRule: 'evenodd', closesPath: false };
  }
  if (operator === ops.stroke || operator === ops.closeStroke) {
    return { paint: 'stroke', fillRule: 'nonzero', closesPath: operator === ops.closeStroke };
  }
  if (operator === ops.fillStroke || operator === ops.closeFillStroke) {
    return { paint: 'fill-stroke', fillRule: 'nonzero', closesPath: operator === ops.closeFillStroke };
  }
  if (operator === ops.eoFillStroke || operator === ops.closeEOFillStroke) {
    return { paint: 'fill-stroke', fillRule: 'evenodd', closesPath: operator === ops.closeEOFillStroke };
  }
  return null;
}

function extractPaintedShapes(
  fnArray: number[],
  argsArray: unknown[][] | undefined,
  page: number,
  ops?: Record<string, number>,
): PdfPaintedShape[] {
  if (!ops || typeof ops.constructPath !== 'number') {
    return [];
  }

  const shapes: PdfPaintedShape[] = [];
  let currentTransform: PdfTransform = [1, 0, 0, 1, 0, 0];
  let currentLineWidth = 1;
  let pendingSubpaths: PdfVectorSubpath[] = [];
  const graphicsStateStack: Array<{ transform: PdfTransform; lineWidth: number }> = [];

  fnArray.forEach((operator, index) => {
    if (operator === ops.save) {
      graphicsStateStack.push({ transform: [...currentTransform] as PdfTransform, lineWidth: currentLineWidth });
      return;
    }
    if (operator === ops.restore) {
      const previousState = graphicsStateStack.pop();
      if (previousState) {
        currentTransform = previousState.transform;
        currentLineWidth = previousState.lineWidth;
      }
      return;
    }
    if (operator === ops.transform) {
      const nextTransform = getTransform(argsArray?.[index]);
      if (nextTransform) {
        currentTransform = combineTransforms(currentTransform, nextTransform);
      }
      return;
    }
    if (operator === ops.setLineWidth) {
      const lineWidth = argsArray?.[index]?.[0];
      if (typeof lineWidth === 'number' && Number.isFinite(lineWidth)) {
        currentLineWidth = lineWidth;
      }
      return;
    }
    if (operator === ops.constructPath) {
      const commands = argsArray?.[index]?.[0];
      const coordinates = argsArray?.[index]?.[1];
      if (Array.isArray(commands) && Array.isArray(coordinates)) {
        pendingSubpaths.push(...extractVectorSubpaths(commands, coordinates, currentTransform, ops));
      }
      return;
    }
    if (operator === ops.closePath) {
      const lastSubpath = pendingSubpaths[pendingSubpaths.length - 1];
      if (lastSubpath) {
        lastSubpath.closed = true;
      }
      return;
    }
    if (operator === ops.endPath) {
      pendingSubpaths = [];
      return;
    }

    const paintOperation = getPaintOperation(operator, ops);
    if (!paintOperation) {
      return;
    }
    if (paintOperation.closesPath) {
      const lastSubpath = pendingSubpaths[pendingSubpaths.length - 1];
      if (lastSubpath) {
        lastSubpath.closed = true;
      }
    }
    const bounds = getSubpathBounds(pendingSubpaths);
    if (bounds) {
      shapes.push({
        page,
        paint: paintOperation.paint,
        fillRule: paintOperation.fillRule,
        strokeWidth: paintOperation.paint === 'fill' ? null : currentLineWidth,
        subpaths: pendingSubpaths,
        bounds,
      });
    }
    pendingSubpaths = [];
  });

  return shapes;
}

function normalizeTextItems(
  items: PdfTextContentItem[],
  styles: Record<string, PdfTextContentStyle> | undefined,
  page: number,
): PdfTextItem[] {
  return items
    .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0)
    .map((item) => {
      const transform = item.transform ?? [0, 0, 0, 0, 0, 0];
      const fontName = typeof item.fontName === 'string' && item.fontName.length > 0 ? item.fontName : null;
      const styleFontFamily = fontName ? styles?.[fontName]?.fontFamily : undefined;
      const fontFamily = typeof styleFontFamily === 'string' ? styleFontFamily : null;

      return {
        text: item.str!.trim(),
        page,
        x: transform[4] ?? 0,
        y: transform[5] ?? 0,
        width: item.width ?? 0,
        height: item.height ?? Math.abs(transform[3] ?? 0),
        fontSize: Math.abs(transform[3] ?? item.height ?? 0),
        ...(fontName ? { fontName } : {}),
        ...(fontFamily ? { fontFamily } : {}),
      };
    });
}

function isPrivateUseCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0);
  return codePoint !== undefined && (
    (codePoint >= 0xE000 && codePoint <= 0xF8FF)
    || (codePoint >= 0xF0000 && codePoint <= 0xFFFFD)
    || (codePoint >= 0x100000 && codePoint <= 0x10FFFD)
  );
}

function extractMusicGlyphs(textItems: PdfTextItem[]): PdfMusicGlyphEvidence[] {
  return textItems.flatMap((item) => {
    const normalizedFamily = item.fontFamily?.trim().toLowerCase().replace(/\s+/g, ' ') ?? null;
    const hasReliableFamily = normalizedFamily !== null && SMUFL_FAMILIES.has(normalizedFamily);
    const bounds: PdfBounds = {
      x1: Math.min(item.x, item.x + item.width),
      y1: Math.min(item.y, item.y + item.height),
      x2: Math.max(item.x, item.x + item.width),
      y2: Math.max(item.y, item.y + item.height),
    };

    return [...item.text]
      .filter(isPrivateUseCharacter)
      .map((character): PdfMusicGlyphEvidence => {
        const semantic = hasReliableFamily ? SMUFL_SEMANTICS[character] ?? null : null;
        return {
          page: item.page,
          bounds,
          fontName: item.fontName ?? null,
          fontFamily: item.fontFamily ?? null,
          text: character,
          semantic,
          mapping: semantic ? 'reliable' : 'unknown',
        };
      });
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
    const vectorShapes: PdfPaintedShape[] = [];
    const musicGlyphs: PdfMusicGlyphEvidence[] = [];
    let vectorDrawingCount = 0;
    let imageCount = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const [textContent, operatorList, annotations] = await Promise.all([
        page.getTextContent(),
        page.getOperatorList(),
        page.getAnnotations(),
      ]);
      const pageTextItems = normalizeTextItems(textContent.items, textContent.styles, pageNumber);
      textItems.push(...pageTextItems);
      musicGlyphs.push(...extractMusicGlyphs(pageTextItems));
      lineSegments.push(...extractLineSegments(operatorList.fnArray, operatorList.argsArray, pageNumber, pdfjs.OPS));
      vectorShapes.push(...extractPaintedShapes(operatorList.fnArray, operatorList.argsArray, pageNumber, pdfjs.OPS));
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
      vectorShapes,
      musicGlyphs,
      timeSignature: findTimeSignature(textItems),
    };
  } finally {
    document.destroy();
  }
}
