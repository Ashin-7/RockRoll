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

type Bounds = PdfVectorPath['bounds'];
type NoteheadKind = 'open' | 'filled';

interface NoteheadCandidate {
  kind: NoteheadKind;
  path: PdfVectorPath;
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

function areBeamLayersNonUnique(first: PdfVectorPath, second: PdfVectorPath): boolean {
  const regionsOverlap =
    intervalsOverlap(first.bounds.x1, first.bounds.x2, second.bounds.x1, second.bounds.x2, 0) &&
    intervalsOverlap(first.bounds.y1, first.bounds.y2, second.bounds.y1, second.bounds.y2, 0);
  const firstCenterY = (first.bounds.y1 + first.bounds.y2) / 2;
  const secondCenterY = (second.bounds.y1 + second.bounds.y2) / 2;
  const maximumThickness = Math.max(getHeight(first.bounds), getHeight(second.bounds));

  return regionsOverlap || Math.abs(firstCenterY - secondCenterY) <= 0.5 * maximumThickness;
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
): RhythmGlyphEvent {
  return {
    page,
    systemIndex,
    x: (notehead.path.bounds.x1 + notehead.path.bounds.x2) / 2,
    duration,
    dots: 0,
    isRest: false,
    confidence: 'high',
    sourceSymbols,
  };
}

function classifyNotehead(
  notehead: NoteheadCandidate,
  paths: PdfVectorPath[],
  system: PairedStaffSystem,
  systemIndex: number,
  staffGap: number,
  warnings: string[],
  ambiguousPaths: Set<PdfVectorPath>,
): RhythmGlyphEvent | null {
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
    return createGlyph(notehead, system.page, systemIndex, 'half', ['open-notehead', 'stem']);
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

  const sourceSymbols = ['filled-notehead', 'stem'];
  if (attachedBeams.length === 1) {
    return createGlyph(notehead, system.page, systemIndex, 'eighth', [...sourceSymbols, 'beam-1']);
  }
  if (attachedBeams.length === 2) {
    return createGlyph(notehead, system.page, systemIndex, '16th', [
      ...sourceSymbols,
      'beam-1',
      'beam-2',
    ]);
  }
  return createGlyph(notehead, system.page, systemIndex, 'quarter', sourceSymbols);
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
    const ambiguousPaths = new Set(
      systemPaths.filter(
        (path) => isCompactNotehead(path, staffGap) && isBeam(path, staffGap),
      ),
    );
    if (ambiguousPaths.size > 0) {
      warnings.push(
        `第 ${system.page} 页第 ${systemIndex + 1} 个系统存在同时符合符头与符梁规则的歧义路径，已跳过该路径。`,
      );
    }
    const noteheads: NoteheadCandidate[] = systemPaths
      .filter((path) => !ambiguousPaths.has(path) && isCompactNotehead(path, staffGap))
      .map((path) => ({ path, kind: getNoteheadKind(path) }))
      .filter((candidate): candidate is NoteheadCandidate => candidate.kind !== null);

    noteheads.forEach((notehead) => {
      const glyph = classifyNotehead(
        notehead,
        systemPaths,
        system,
        systemIndex,
        staffGap,
        warnings,
        ambiguousPaths,
      );
      if (glyph) {
        glyphs.push(glyph);
      }
    });
  });

  return { glyphs, warnings };
}
