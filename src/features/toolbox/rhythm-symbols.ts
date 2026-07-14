import type {
  PairedStaffSystem,
  PdfVectorCommand,
  PdfVectorPath,
  RhythmDuration,
  RhythmGlyphEvent,
  RhythmGlyphResult,
} from './toolbox.types';

const NOTEHEAD_MIN_WIDTH_GAPS = 0.6;
const NOTEHEAD_MAX_WIDTH_GAPS = 1.8;
const NOTEHEAD_MIN_HEIGHT_GAPS = 0.4;
const NOTEHEAD_MAX_HEIGHT_GAPS = 1.3;
const STEM_CONTACT_TOLERANCE_GAPS = 0.2;
const STEM_MIN_HEIGHT_GAPS = 1;
const STEM_MIN_ASPECT_RATIO = 3;
const STEM_MIN_WIDTH_GAPS = 0.01;
const STEM_LINE_HORIZONTAL_TOLERANCE_GAPS = 0.2;
const BEAM_MIN_THICKNESS_GAPS = 0.12;
const BEAM_MAX_THICKNESS_GAPS = 0.6;
const BEAM_MIN_WIDTH_GAPS = 0.8;
const BEAM_CONTACT_TOLERANCE_GAPS = 0.2;
const FLAG_MIN_WIDTH_GAPS = 0.3;
const FLAG_MAX_WIDTH_GAPS = 1.2;
const FLAG_MIN_HEIGHT_GAPS = 0.6;
const FLAG_MAX_HEIGHT_GAPS = 1.8;
const FLAG_CONTACT_TOLERANCE_GAPS = 0.2;
const REST_RECT_MIN_WIDTH_GAPS = 0.8;
const REST_RECT_MAX_WIDTH_GAPS = 1.4;
const REST_RECT_MIN_HEIGHT_GAPS = 0.25;
const REST_RECT_MAX_HEIGHT_GAPS = 0.5;
const REST_LINE_ATTACHMENT_TOLERANCE_GAPS = 0.1;
const QUARTER_REST_MIN_WIDTH_GAPS = 0.5;
const QUARTER_REST_MAX_WIDTH_GAPS = 1;
const QUARTER_REST_MIN_HEIGHT_GAPS = 2;
const QUARTER_REST_MAX_HEIGHT_GAPS = 3.5;
const QUARTER_REST_CENTER_TOLERANCE_GAPS = 0.5;
const EIGHTH_REST_MIN_WIDTH_GAPS = 0.7;
const EIGHTH_REST_MAX_WIDTH_GAPS = 1.4;
const EIGHTH_REST_MIN_HEIGHT_GAPS = 1.5;
const EIGHTH_REST_MAX_HEIGHT_GAPS = 3;
const EIGHTH_REST_CENTER_TOLERANCE_GAPS = 0.75;
const SIXTEENTH_REST_MIN_WIDTH_GAPS = 0.7;
const SIXTEENTH_REST_MAX_WIDTH_GAPS = 1.4;
const SIXTEENTH_REST_MIN_HEIGHT_GAPS = 2.5;
const SIXTEENTH_REST_MAX_HEIGHT_GAPS = 4;
const SIXTEENTH_REST_CENTER_TOLERANCE_GAPS = 0.75;
const DOT_MIN_SIZE_GAPS = 0.15;
const DOT_MAX_SIZE_GAPS = 0.35;
const DOT_MIN_ASPECT_RATIO = 0.75;
const DOT_MAX_ASPECT_RATIO = 1.33;
const DOT_MIN_HORIZONTAL_GAP_GAPS = 0.15;
const DOT_MAX_HORIZONTAL_GAP_GAPS = 0.5;
const DOT_VERTICAL_TOLERANCE_GAPS = 0.25;
const NORMALIZED_COMPARISON_TOLERANCE = 1e-9;
const QUARTER_REST_TOPOLOGY = 'move-curve-line-curve-line-curve-close';
const EIGHTH_REST_TOPOLOGY = 'move-line-curve-curve-line-close';
const SIXTEENTH_REST_TOPOLOGY = 'move-line-curve-curve-line-curve-curve-line-close';

type Bounds = PdfVectorPath['bounds'];
type NoteheadKind = 'open' | 'filled';

interface NoteheadCandidate {
  kind: NoteheadKind;
  path: PdfVectorPath;
}

interface ClassifiedGlyph {
  event: RhythmGlyphEvent;
  bounds: Bounds;
  paths: PdfVectorPath[];
}

function getStaffGap(system: PairedStaffSystem): number {
  const gaps = system.standardLineYs.slice(1).map(
    (lineY, index) => Math.abs(lineY - system.standardLineYs[index]),
  );
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

function getWidth(bounds: Bounds): number {
  return Math.abs(bounds.x2 - bounds.x1);
}

function getHeight(bounds: Bounds): number {
  return Math.abs(bounds.y2 - bounds.y1);
}

function getCenterY(bounds: Bounds): number {
  return (bounds.y1 + bounds.y2) / 2;
}

function hasSizeInRange(
  bounds: Bounds,
  staffGap: number,
  minWidthGaps: number,
  maxWidthGaps: number,
  minHeightGaps: number,
  maxHeightGaps: number,
): boolean {
  const width = getWidth(bounds) / staffGap;
  const height = getHeight(bounds) / staffGap;
  return (
    width >= minWidthGaps &&
    width <= maxWidthGaps &&
    height >= minHeightGaps &&
    height <= maxHeightGaps
  );
}

function getTopology(path: PdfVectorPath): string {
  return path.commands.map((command) => command.type).join('-');
}

function isFilled(path: PdfVectorPath): boolean {
  return path.paint === 'fill' || path.paint === 'fill-stroke';
}

function unionBounds(paths: PdfVectorPath[]): Bounds {
  return {
    x1: Math.min(...paths.map((path) => path.bounds.x1)),
    y1: Math.min(...paths.map((path) => path.bounds.y1)),
    x2: Math.max(...paths.map((path) => path.bounds.x2)),
    y2: Math.max(...paths.map((path) => path.bounds.y2)),
  };
}

function hasClosedContour(path: PdfVectorPath): boolean {
  return path.commands.some((command) => command.type === 'close');
}

function isClosedStraightQuadrilateral(path: PdfVectorPath): boolean {
  if (path.commands.length < 5 || path.commands[path.commands.length - 1].type !== 'close') {
    return false;
  }

  const drawingCommands = path.commands.slice(0, -1);
  if (drawingCommands[0].type !== 'move') {
    return false;
  }

  const points: Array<{ x: number; y: number }> = [];
  for (const [index, command] of drawingCommands.entries()) {
    if ((index === 0 && command.type !== 'move') || (index > 0 && command.type !== 'line')) {
      return false;
    }
    if (command.type === 'move' || command.type === 'line') {
      points.push({ x: command.x, y: command.y });
    }
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  if (lastPoint.x === firstPoint.x && lastPoint.y === firstPoint.y) {
    points.pop();
  }

  return (
    points.length === 4 &&
    new Set(points.map((point) => `${point.x}:${point.y}`)).size === 4
  );
}

function getCommandPoint(command: PdfVectorCommand): { x: number; y: number } | null {
  if (command.type === 'move' || command.type === 'line' || command.type === 'curve') {
    return { x: command.x, y: command.y };
  }
  return null;
}

function getClosedContourBounds(path: PdfVectorPath): Bounds[] {
  const contours: Bounds[] = [];
  let points: Array<{ x: number; y: number }> = [];

  path.commands.forEach((command) => {
    if (command.type === 'move') {
      points = [{ x: command.x, y: command.y }];
      return;
    }
    if (command.type === 'close') {
      if (points.length >= 3) {
        contours.push({
          x1: Math.min(...points.map((point) => point.x)),
          y1: Math.min(...points.map((point) => point.y)),
          x2: Math.max(...points.map((point) => point.x)),
          y2: Math.max(...points.map((point) => point.y)),
        });
      }
      points = [];
      return;
    }

    const point = getCommandPoint(command);
    if (point) {
      points.push(point);
    }
  });

  return contours;
}

function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x1 > outer.x1 &&
    inner.y1 > outer.y1 &&
    inner.x2 < outer.x2 &&
    inner.y2 < outer.y2
  );
}

function hasNestedClosedContour(path: PdfVectorPath): boolean {
  const contours = getClosedContourBounds(path);
  return contours.some((outer, outerIndex) =>
    contours.some((inner, innerIndex) => outerIndex !== innerIndex && containsBounds(outer, inner)),
  );
}

function getNoteheadKind(path: PdfVectorPath): NoteheadKind | null {
  if (path.paint === 'stroke') {
    return 'open';
  }
  if (path.paint === 'fill') {
    return 'filled';
  }
  return hasNestedClosedContour(path) ? 'open' : 'filled';
}

function isCompactNotehead(path: PdfVectorPath, staffGap: number): boolean {
  const width = getWidth(path.bounds);
  const height = getHeight(path.bounds);
  return (
    hasClosedContour(path) &&
    width >= NOTEHEAD_MIN_WIDTH_GAPS * staffGap &&
    width <= NOTEHEAD_MAX_WIDTH_GAPS * staffGap &&
    height >= NOTEHEAD_MIN_HEIGHT_GAPS * staffGap &&
    height <= NOTEHEAD_MAX_HEIGHT_GAPS * staffGap
  );
}

function isSingleStrokeLineStem(path: PdfVectorPath, staffGap: number): boolean {
  if (path.paint !== 'stroke' || path.commands.length !== 2) {
    return false;
  }
  const [start, end] = path.commands;
  if (start.type !== 'move' || end.type !== 'line') {
    return false;
  }
  return (
    Math.abs(end.x - start.x) <= STEM_LINE_HORIZONTAL_TOLERANCE_GAPS * staffGap &&
    Math.abs(end.y - start.y) >= STEM_MIN_HEIGHT_GAPS * staffGap
  );
}

function isStem(path: PdfVectorPath, staffGap: number): boolean {
  const width = getWidth(path.bounds);
  const height = getHeight(path.bounds);
  const hasStemAspect =
    height >= STEM_MIN_HEIGHT_GAPS * staffGap &&
    height >= STEM_MIN_ASPECT_RATIO * Math.max(width, STEM_MIN_WIDTH_GAPS * staffGap);

  if (!hasStemAspect) {
    return false;
  }
  if (path.paint !== 'stroke') {
    return hasClosedContour(path);
  }
  return isSingleStrokeLineStem(path, staffGap);
}

function intervalsOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
  tolerance: number,
): boolean {
  return Math.max(firstStart, secondStart) <= Math.min(firstEnd, secondEnd) + tolerance;
}

function boundsTouch(first: Bounds, second: Bounds, tolerance: number): boolean {
  return (
    intervalsOverlap(first.x1, first.x2, second.x1, second.x2, tolerance) &&
    intervalsOverlap(first.y1, first.y2, second.y1, second.y2, tolerance)
  );
}

function isBeam(path: PdfVectorPath, staffGap: number): boolean {
  const width = getWidth(path.bounds);
  const height = getHeight(path.bounds);
  return (
    path.paint !== 'stroke' &&
    isClosedStraightQuadrilateral(path) &&
    width >= BEAM_MIN_WIDTH_GAPS * staffGap &&
    height >= BEAM_MIN_THICKNESS_GAPS * staffGap &&
    height <= BEAM_MAX_THICKNESS_GAPS * staffGap
  );
}

function isFlagShape(path: PdfVectorPath, staffGap: number): boolean {
  return (
    isFilled(path) &&
    hasClosedContour(path) &&
    path.commands.some((command) => command.type === 'curve') &&
    hasSizeInRange(
      path.bounds,
      staffGap,
      FLAG_MIN_WIDTH_GAPS,
      FLAG_MAX_WIDTH_GAPS,
      FLAG_MIN_HEIGHT_GAPS,
      FLAG_MAX_HEIGHT_GAPS,
    )
  );
}

function getStemEndBounds(stem: PdfVectorPath): [Bounds, Bounds] {
  const x = (stem.bounds.x1 + stem.bounds.x2) / 2;
  return [
    { x1: x, y1: stem.bounds.y1, x2: x, y2: stem.bounds.y1 },
    { x1: x, y1: stem.bounds.y2, x2: x, y2: stem.bounds.y2 },
  ];
}

function getRemoteStemEnd(stem: PdfVectorPath, notehead: PdfVectorPath): Bounds {
  const [first, second] = getStemEndBounds(stem);
  const noteheadCenterY = getCenterY(notehead.bounds);
  return Math.abs(first.y1 - noteheadCenterY) >= Math.abs(second.y1 - noteheadCenterY)
    ? first
    : second;
}

function findContextualFlagPaths(paths: PdfVectorPath[], staffGap: number): Set<PdfVectorPath> {
  const stems = paths.filter((path) => isStem(path, staffGap));
  const compactPaths = paths.filter((path) => isCompactNotehead(path, staffGap));
  const tolerance = FLAG_CONTACT_TOLERANCE_GAPS * staffGap;

  return new Set(paths.filter((flagPath) => (
    isFlagShape(flagPath, staffGap) &&
    stems.some((stem) => compactPaths.some((noteheadPath) => (
      noteheadPath !== flagPath &&
      boundsTouch(stem.bounds, noteheadPath.bounds, STEM_CONTACT_TOLERANCE_GAPS * staffGap) &&
      boundsTouch(flagPath.bounds, getRemoteStemEnd(stem, noteheadPath), tolerance)
    )))
  )));
}

function isRectangularRest(path: PdfVectorPath, staffGap: number): boolean {
  return (
    isFilled(path) &&
    isClosedStraightQuadrilateral(path) &&
    hasSizeInRange(
      path.bounds,
      staffGap,
      REST_RECT_MIN_WIDTH_GAPS,
      REST_RECT_MAX_WIDTH_GAPS,
      REST_RECT_MIN_HEIGHT_GAPS,
      REST_RECT_MAX_HEIGHT_GAPS,
    )
  );
}

function isAttachedToLine(edgeY: number, lineY: number, staffGap: number): boolean {
  return Math.abs(edgeY - lineY) <= REST_LINE_ATTACHMENT_TOLERANCE_GAPS * staffGap;
}

function matchesRestTopology(
  path: PdfVectorPath,
  staffGap: number,
  topology: string,
  minWidthGaps: number,
  maxWidthGaps: number,
  minHeightGaps: number,
  maxHeightGaps: number,
  centerToleranceGaps: number,
  middleLineY: number,
): boolean {
  return (
    isFilled(path) &&
    getTopology(path) === topology &&
    hasSizeInRange(
      path.bounds,
      staffGap,
      minWidthGaps,
      maxWidthGaps,
      minHeightGaps,
      maxHeightGaps,
    ) &&
    Math.abs(getCenterY(path.bounds) - middleLineY) <= centerToleranceGaps * staffGap
  );
}

function isDot(path: PdfVectorPath, staffGap: number): boolean {
  const width = getWidth(path.bounds);
  const height = getHeight(path.bounds);
  const aspectRatio = width / height;
  return (
    isFilled(path) &&
    hasClosedContour(path) &&
    path.commands.filter((command) => command.type === 'move').length === 1 &&
    path.commands.filter((command) => command.type === 'close').length === 1 &&
    width >= DOT_MIN_SIZE_GAPS * staffGap &&
    width <= DOT_MAX_SIZE_GAPS * staffGap &&
    height >= DOT_MIN_SIZE_GAPS * staffGap &&
    height <= DOT_MAX_SIZE_GAPS * staffGap &&
    aspectRatio >= DOT_MIN_ASPECT_RATIO - NORMALIZED_COMPARISON_TOLERANCE &&
    aspectRatio <= DOT_MAX_ASPECT_RATIO + NORMALIZED_COMPARISON_TOLERANCE
  );
}

function isPotentialRestOrDot(path: PdfVectorPath, staffGap: number): boolean {
  const normalizedWidth = getWidth(path.bounds) / staffGap;
  const normalizedHeight = getHeight(path.bounds) / staffGap;
  const containsCurve = path.commands.some((command) => command.type === 'curve');
  const isNearDotSize =
    isFilled(path) &&
    hasClosedContour(path) &&
    normalizedWidth >= 0.1 &&
    normalizedWidth < NOTEHEAD_MIN_WIDTH_GAPS &&
    normalizedHeight >= 0.1 &&
    normalizedHeight < NOTEHEAD_MIN_HEIGHT_GAPS;
  return isRectangularRest(path, staffGap) || containsCurve || isNearDotSize;
}

function isImmediatelyRightOf(dotBounds: Bounds, eventBounds: Bounds, staffGap: number): boolean {
  const horizontalGap = dotBounds.x1 - eventBounds.x2;
  const verticalTolerance = DOT_VERTICAL_TOLERANCE_GAPS * staffGap;
  return (
    horizontalGap >= DOT_MIN_HORIZONTAL_GAP_GAPS * staffGap &&
    horizontalGap <= DOT_MAX_HORIZONTAL_GAP_GAPS * staffGap &&
    getCenterY(dotBounds) >= eventBounds.y1 - verticalTolerance &&
    getCenterY(dotBounds) <= eventBounds.y2 + verticalTolerance
  );
}

function areBeamLayersNonUnique(first: PdfVectorPath, second: PdfVectorPath): boolean {
  const regionsOverlap =
    intervalsOverlap(first.bounds.x1, first.bounds.x2, second.bounds.x1, second.bounds.x2, 0) &&
    intervalsOverlap(first.bounds.y1, first.bounds.y2, second.bounds.y1, second.bounds.y2, 0);
  const firstCenterY = (first.bounds.y1 + first.bounds.y2) / 2;
  const secondCenterY = (second.bounds.y1 + second.bounds.y2) / 2;
  const maximumThickness = Math.max(getHeight(first.bounds), getHeight(second.bounds));

  return regionsOverlap || Math.abs(firstCenterY - secondCenterY) <= 0.5 * maximumThickness;
}

function areFlagLayersNonUnique(first: PdfVectorPath, second: PdfVectorPath): boolean {
  const overlapWidth = Math.min(first.bounds.x2, second.bounds.x2) - Math.max(first.bounds.x1, second.bounds.x1);
  const overlapHeight = Math.min(first.bounds.y2, second.bounds.y2) - Math.max(first.bounds.y1, second.bounds.y1);
  const firstCenterY = getCenterY(first.bounds);
  const secondCenterY = getCenterY(second.bounds);
  const maximumHeight = Math.max(getHeight(first.bounds), getHeight(second.bounds));

  return (
    (overlapWidth > 0 && overlapHeight > 0) ||
    Math.abs(firstCenterY - secondCenterY) <= 0.5 * maximumHeight
  );
}

function isInsideSystemBand(path: PdfVectorPath, system: PairedStaffSystem, staffGap: number): boolean {
  const top = Math.min(...system.standardLineYs) - staffGap;
  const bottom = Math.max(...system.standardLineYs) + staffGap;
  return (
    path.page === system.page &&
    path.bounds.x1 >= system.x1 &&
    path.bounds.x2 <= system.x2 &&
    path.bounds.y1 >= top &&
    path.bounds.y2 <= bottom
  );
}

function createGlyph(
  notehead: NoteheadCandidate,
  page: number,
  systemIndex: number,
  duration: RhythmDuration,
  sourceSymbols: string[],
  attachedPaths: PdfVectorPath[] = [],
): ClassifiedGlyph {
  const paths = [notehead.path, ...attachedPaths];
  return {
    event: {
      page,
      systemIndex,
      x: (notehead.path.bounds.x1 + notehead.path.bounds.x2) / 2,
      duration,
      dots: 0,
      isRest: false,
      confidence: 'high',
      sourceSymbols,
    },
    bounds: unionBounds(paths),
    paths,
  };
}

function createRestGlyph(
  path: PdfVectorPath,
  system: PairedStaffSystem,
  systemIndex: number,
  duration: RhythmDuration,
): ClassifiedGlyph {
  return {
    event: {
      page: system.page,
      systemIndex,
      x: (path.bounds.x1 + path.bounds.x2) / 2,
      duration,
      dots: 0,
      isRest: true,
      confidence: 'high',
      sourceSymbols: [`${duration}-rest`],
    },
    bounds: path.bounds,
    paths: [path],
  };
}

function classifyRest(
  path: PdfVectorPath,
  system: PairedStaffSystem,
  systemIndex: number,
  staffGap: number,
): ClassifiedGlyph | null {
  if (isRectangularRest(path, staffGap)) {
    if (isAttachedToLine(path.bounds.y2, system.standardLineYs[3], staffGap)) {
      return createRestGlyph(path, system, systemIndex, 'whole');
    }
    if (isAttachedToLine(path.bounds.y1, system.standardLineYs[2], staffGap)) {
      return createRestGlyph(path, system, systemIndex, 'half');
    }
    return null;
  }

  const middleLineY = system.standardLineYs[2];
  if (
    matchesRestTopology(
      path,
      staffGap,
      QUARTER_REST_TOPOLOGY,
      QUARTER_REST_MIN_WIDTH_GAPS,
      QUARTER_REST_MAX_WIDTH_GAPS,
      QUARTER_REST_MIN_HEIGHT_GAPS,
      QUARTER_REST_MAX_HEIGHT_GAPS,
      QUARTER_REST_CENTER_TOLERANCE_GAPS,
      middleLineY,
    )
  ) {
    return createRestGlyph(path, system, systemIndex, 'quarter');
  }
  if (
    matchesRestTopology(
      path,
      staffGap,
      EIGHTH_REST_TOPOLOGY,
      EIGHTH_REST_MIN_WIDTH_GAPS,
      EIGHTH_REST_MAX_WIDTH_GAPS,
      EIGHTH_REST_MIN_HEIGHT_GAPS,
      EIGHTH_REST_MAX_HEIGHT_GAPS,
      EIGHTH_REST_CENTER_TOLERANCE_GAPS,
      middleLineY,
    )
  ) {
    return createRestGlyph(path, system, systemIndex, 'eighth');
  }
  if (
    matchesRestTopology(
      path,
      staffGap,
      SIXTEENTH_REST_TOPOLOGY,
      SIXTEENTH_REST_MIN_WIDTH_GAPS,
      SIXTEENTH_REST_MAX_WIDTH_GAPS,
      SIXTEENTH_REST_MIN_HEIGHT_GAPS,
      SIXTEENTH_REST_MAX_HEIGHT_GAPS,
      SIXTEENTH_REST_CENTER_TOLERANCE_GAPS,
      middleLineY,
    )
  ) {
    return createRestGlyph(path, system, systemIndex, '16th');
  }
  return null;
}

function classifyNotehead(
  notehead: NoteheadCandidate,
  paths: PdfVectorPath[],
  system: PairedStaffSystem,
  systemIndex: number,
  staffGap: number,
  warnings: string[],
  ambiguousPaths: Set<PdfVectorPath>,
  flagPaths: Set<PdfVectorPath>,
): ClassifiedGlyph | null {
  const stems = paths.filter(
    (path) =>
      path !== notehead.path &&
      isStem(path, staffGap) &&
      boundsTouch(path.bounds, notehead.path.bounds, STEM_CONTACT_TOLERANCE_GAPS * staffGap),
  );

  if (stems.length > 1) {
    warnings.push(`第 ${system.page} 页第 ${systemIndex + 1} 个系统存在非唯一符干匹配。`);
    return null;
  }
  if (notehead.kind === 'open' && stems.length === 0) {
    return createGlyph(notehead, system.page, systemIndex, 'whole', ['open-notehead']);
  }
  if (notehead.kind === 'open') {
    return createGlyph(notehead, system.page, systemIndex, 'half', ['open-notehead', 'stem'], stems);
  }
  if (stems.length === 0) {
    warnings.push(`第 ${system.page} 页第 ${systemIndex + 1} 个系统存在无符干的实心符头。`);
    return null;
  }

  const attachedBeams = paths.filter(
    (path) =>
      path !== notehead.path &&
      path !== stems[0] &&
      !ambiguousPaths.has(path) &&
      isBeam(path, staffGap) &&
      boundsTouch(path.bounds, stems[0].bounds, BEAM_CONTACT_TOLERANCE_GAPS * staffGap),
  );
  const remoteStemEnd = getRemoteStemEnd(stems[0], notehead.path);
  const attachedFlags = paths.filter(
    (path) =>
      flagPaths.has(path) &&
      boundsTouch(path.bounds, remoteStemEnd, FLAG_CONTACT_TOLERANCE_GAPS * staffGap),
  );
  if (attachedBeams.length > 0 && attachedFlags.length > 0) {
    warnings.push(`第 ${system.page} 页第 ${systemIndex + 1} 个系统存在符梁与符尾混合证据，事件已降级。`);
    const glyph = createGlyph(
      notehead,
      system.page,
      systemIndex,
      'quarter',
      ['filled-notehead', 'stem'],
      [...stems, ...attachedBeams, ...attachedFlags],
    );
    glyph.event.confidence = 'medium';
    return glyph;
  }
  const hasNonUniqueBeamLayer = attachedBeams.some((beam, beamIndex) =>
    attachedBeams.slice(beamIndex + 1).some((candidate) => areBeamLayersNonUnique(beam, candidate)),
  );
  if (hasNonUniqueBeamLayer) {
    warnings.push(
      `第 ${system.page} 页第 ${systemIndex + 1} 个系统存在重叠或间距过近的符梁轮廓，符梁层级不唯一。`,
    );
    return null;
  }
  if (attachedBeams.length > 2) {
    warnings.push(`第 ${system.page} 页第 ${systemIndex + 1} 个系统存在超过两个可确认的符梁层级。`);
    return null;
  }

  const hasNonUniqueFlagLayer = attachedFlags.some((flag, flagIndex) =>
    attachedFlags.slice(flagIndex + 1).some((candidate) => areFlagLayersNonUnique(flag, candidate)),
  );
  if (hasNonUniqueFlagLayer || attachedFlags.length > 2) {
    warnings.push(`第 ${system.page} 页第 ${systemIndex + 1} 个系统存在不唯一或冲突的符尾结构，事件已降级。`);
    const glyph = createGlyph(
      notehead,
      system.page,
      systemIndex,
      'quarter',
      ['filled-notehead', 'stem'],
      [...stems, ...attachedFlags],
    );
    glyph.event.confidence = 'medium';
    return glyph;
  }

  const sourceSymbols = ['filled-notehead', 'stem'];
  if (attachedBeams.length === 1) {
    return createGlyph(
      notehead,
      system.page,
      systemIndex,
      'eighth',
      [...sourceSymbols, 'beam-1'],
      [...stems, ...attachedBeams],
    );
  }
  if (attachedBeams.length === 2) {
    return createGlyph(notehead, system.page, systemIndex, '16th', [
      ...sourceSymbols,
      'beam-1',
      'beam-2',
    ], [...stems, ...attachedBeams]);
  }
  if (attachedFlags.length === 1) {
    return createGlyph(
      notehead,
      system.page,
      systemIndex,
      'eighth',
      [...sourceSymbols, 'flag-1'],
      [...stems, ...attachedFlags],
    );
  }
  if (attachedFlags.length === 2) {
    return createGlyph(notehead, system.page, systemIndex, '16th', [
      ...sourceSymbols,
      'flag-1',
      'flag-2',
    ], [...stems, ...attachedFlags]);
  }
  return createGlyph(notehead, system.page, systemIndex, 'quarter', sourceSymbols, stems);
}

export function recognizeRhythmGlyphs(
  paths: PdfVectorPath[],
  pairedSystems: PairedStaffSystem[],
): RhythmGlyphResult {
  const glyphs: RhythmGlyphEvent[] = [];
  const warnings: string[] = [];

  pairedSystems.forEach((system, systemIndex) => {
    if (system.confidence !== 'high') {
      warnings.push(`第 ${system.page} 页第 ${systemIndex + 1} 个系统置信度不足，已跳过节奏识别。`);
      return;
    }

    const staffGap = getStaffGap(system);
    if (!Number.isFinite(staffGap) || staffGap <= 0) {
      warnings.push(`第 ${system.page} 页第 ${systemIndex + 1} 个系统缺少有效五线谱间距。`);
      return;
    }

    const systemPaths = paths.filter((path) => isInsideSystemBand(path, system, staffGap));
    const dotPaths = systemPaths.filter((path) => isDot(path, staffGap));
    const flagPaths = findContextualFlagPaths(systemPaths, staffGap);
    const ambiguousPaths = new Set(
      systemPaths.filter(
        (path) => isCompactNotehead(path, staffGap) && isBeam(path, staffGap),
      ),
    );
    const noteheads: NoteheadCandidate[] = systemPaths
      .filter((path) => !ambiguousPaths.has(path) && !flagPaths.has(path) && isCompactNotehead(path, staffGap))
      .map((path) => ({ path, kind: getNoteheadKind(path) }))
      .filter((candidate): candidate is NoteheadCandidate => candidate.kind !== null);

    const noteGlyphs: ClassifiedGlyph[] = [];
    noteheads.forEach((notehead) => {
      const glyph = classifyNotehead(
        notehead,
        systemPaths,
        system,
        systemIndex,
        staffGap,
        warnings,
        ambiguousPaths,
        flagPaths,
      );
      if (glyph) {
        noteGlyphs.push(glyph);
      }
    });

    const consumedNotePaths = new Set(noteGlyphs.flatMap((glyph) => glyph.paths));
    const restGlyphs = systemPaths
      .filter((path) => !dotPaths.includes(path) && !consumedNotePaths.has(path))
      .map((path) => classifyRest(path, system, systemIndex, staffGap))
      .filter((glyph): glyph is ClassifiedGlyph => glyph !== null);
    const restPaths = new Set(restGlyphs.flatMap((glyph) => glyph.paths));
    const unresolvedAmbiguousPaths = new Set(
      [...ambiguousPaths].filter(
        (path) => !consumedNotePaths.has(path) && !restPaths.has(path),
      ),
    );
    if (unresolvedAmbiguousPaths.size > 0) {
      warnings.push(
        `第 ${system.page} 页第 ${systemIndex + 1} 个系统存在同时符合符头与符梁规则的歧义路径，已跳过该路径。`,
      );
    }
    const classifiedGlyphs = [...restGlyphs, ...noteGlyphs];

    const usedPaths = new Set(classifiedGlyphs.flatMap((glyph) => glyph.paths));
    classifiedGlyphs.forEach((glyph) => {
      const hasUnknownAttachedPath = systemPaths.some((path) => (
        !usedPaths.has(path) &&
        !dotPaths.includes(path) &&
        !unresolvedAmbiguousPaths.has(path) &&
        (isFilled(path) || path.commands.some((command) => command.type === 'curve')) &&
        boundsTouch(path.bounds, glyph.bounds, STEM_CONTACT_TOLERANCE_GAPS * staffGap)
      ));
      if (hasUnknownAttachedPath) {
        glyph.event.confidence = 'medium';
        warnings.push(
          `第 ${system.page} 页第 ${systemIndex + 1} 个系统存在未识别附着路径，受影响事件已降级。`,
        );
      }
    });
    const dotMatches = new Map<PdfVectorPath, ClassifiedGlyph[]>();
    dotPaths.forEach((dotPath) => {
      dotMatches.set(
        dotPath,
        classifiedGlyphs.filter(
          (glyph) =>
            !glyph.paths.includes(dotPath) &&
            isImmediatelyRightOf(dotPath.bounds, glyph.bounds, staffGap),
        ),
      );
    });
    const ambiguousDots = new Set(
      dotPaths.filter((dotPath) => (dotMatches.get(dotPath)?.length ?? 0) > 1),
    );
    if (ambiguousDots.size > 0) {
      warnings.push(
        `第 ${system.page} 页第 ${systemIndex + 1} 个系统存在附点归属不唯一，受影响事件已降级。`,
      );
    }

    const matchedDots = new Set<PdfVectorPath>();
    classifiedGlyphs.forEach((glyph) => {
      const matches = dotPaths.filter(
        (dotPath) => dotMatches.get(dotPath)?.includes(glyph),
      );

      if (matches.length === 1 && !ambiguousDots.has(matches[0])) {
        matchedDots.add(matches[0]);
        glyphs.push({
          ...glyph.event,
          dots: 1,
          sourceSymbols: [...glyph.event.sourceSymbols, 'dot'],
        });
        return;
      }
      if (matches.length > 1 || matches.some((dotPath) => ambiguousDots.has(dotPath))) {
        if (matches.length > 1) {
          warnings.push(
            `第 ${system.page} 页第 ${systemIndex + 1} 个系统存在两个附点或以上匹配，事件已降级。`,
          );
        }
        glyphs.push({ ...glyph.event, confidence: 'medium' });
        return;
      }
      glyphs.push(glyph.event);
    });

    dotPaths
      .filter(
        (dotPath) => !matchedDots.has(dotPath) && (dotMatches.get(dotPath)?.length ?? 0) === 0,
      )
      .forEach(() => {
        warnings.push(`第 ${system.page} 页第 ${systemIndex + 1} 个系统存在孤立附点，未生成节奏事件。`);
      });
    systemPaths
      .filter(
        (path) =>
          !usedPaths.has(path) &&
          !dotPaths.includes(path) &&
          !unresolvedAmbiguousPaths.has(path) &&
          isPotentialRestOrDot(path, staffGap),
      )
      .forEach(() => {
        warnings.push(
          `第 ${system.page} 页第 ${systemIndex + 1} 个系统存在不符合明确拓扑或尺寸规则的休止符/附点路径。`,
        );
      });
  });

  return { glyphs, warnings };
}
