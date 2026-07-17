import type {
  MusicGlyphSemantic,
  PairedStaffSystem,
  PdfBounds,
  PdfMusicGlyphEvidence,
  PdfPaintedShape,
  PdfVectorCommand,
  PdfVectorSubpath,
} from './toolbox.types';

export type NotationPrimitive =
  | { id: string; kind: 'contour'; page: number; systemIndex: number; bounds: PdfBounds; closed: boolean; hasHole: boolean; filled: boolean; quality: 'reliable' | 'uncertain'; sourceIds: string[] }
  | { id: string; kind: 'segment'; page: number; systemIndex: number; bounds: PdfBounds; quality: 'reliable' | 'uncertain'; sourceIds: string[] }
  | { id: string; kind: 'glyph'; page: number; systemIndex: number; bounds: PdfBounds; semantic: MusicGlyphSemantic; quality: 'reliable'; sourceIds: string[] }
  | { id: string; kind: 'unknown-glyph'; page: number; systemIndex: number; bounds: PdfBounds; quality: 'uncertain'; sourceIds: string[] };

export interface NotationPrimitiveResult {
  primitives: NotationPrimitive[];
  warnings: string[];
}

export interface NormalizeNotationEvidenceInput {
  shapes: PdfPaintedShape[];
  glyphs: PdfMusicGlyphEvidence[];
  pairedSystems: PairedStaffSystem[];
}

interface Point {
  x: number;
  y: number;
}

type Segment = [Point, Point];

interface SubpathInfo {
  index: number;
  bounds: PdfBounds;
  points: Point[];
  segments: Segment[];
  closed: boolean;
  signedArea: number;
}

interface SubpathGroup {
  index: number;
  subpaths: SubpathInfo[];
  bounds: PdfBounds;
}

const GEOMETRY_EPSILON = 1e-7;
const GEOMETRY_TOLERANCE_IN_STAFF_GAPS = 0.01;
const MAX_BEZIER_SUBDIVISION_DEPTH = 10;
const LINEAR_DEVIATION_IN_STAFF_GAPS = 0.15;
const MINIMUM_LINEAR_LENGTH_IN_STAFF_GAPS = 0.75;
const MAXIMUM_RELIABLE_STROKE_WIDTH_IN_STAFF_GAPS = 0.5;
const SYSTEM_MARGIN_IN_STAFF_GAPS = 4;

function commandPoints(command: PdfVectorCommand): Point[] {
  if (command.type === 'curve') {
    return [
      { x: command.x1, y: command.y1 },
      { x: command.x2, y: command.y2 },
      { x: command.x, y: command.y },
    ];
  }

  return [{ x: command.x, y: command.y }];
}

function getSubpathBounds(subpath: PdfVectorSubpath): PdfBounds | null {
  const points = subpath.commands.flatMap(commandPoints);
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

function midpoint(left: Point, right: Point): Point {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function flattenCubic(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  tolerance: number,
  depth: number,
): Point[] {
  const flatness = Math.max(
    pointDistanceToLine(control1, start, end),
    pointDistanceToLine(control2, start, end),
  );
  if (flatness <= tolerance || depth >= MAX_BEZIER_SUBDIVISION_DEPTH) {
    return [end];
  }

  const startControl = midpoint(start, control1);
  const controlBridge = midpoint(control1, control2);
  const controlEnd = midpoint(control2, end);
  const leftControl = midpoint(startControl, controlBridge);
  const rightControl = midpoint(controlBridge, controlEnd);
  const curveMidpoint = midpoint(leftControl, rightControl);

  return [
    ...flattenCubic(start, startControl, leftControl, curveMidpoint, tolerance, depth + 1),
    ...flattenCubic(curveMidpoint, rightControl, controlEnd, end, tolerance, depth + 1),
  ];
}

function flattenSubpath(subpath: PdfVectorSubpath, tolerance: number): Point[] {
  const points: Point[] = [];
  let currentPoint: Point | null = null;

  subpath.commands.forEach((command) => {
    if (command.type === 'move') {
      currentPoint = { x: command.x, y: command.y };
      points.push(currentPoint);
      return;
    }

    if (command.type === 'line') {
      currentPoint = { x: command.x, y: command.y };
      points.push(currentPoint);
      return;
    }

    if (command.type !== 'curve') {
      return;
    }

    if (!currentPoint) {
      currentPoint = { x: command.x, y: command.y };
      points.push(currentPoint);
      return;
    }

    const end = { x: command.x, y: command.y };
    points.push(...flattenCubic(
      currentPoint,
      { x: command.x1, y: command.y1 },
      { x: command.x2, y: command.y2 },
      end,
      tolerance,
      0,
    ));
    currentPoint = end;
  });

  return points;
}

function getSignedArea(points: Point[]): number {
  if (points.length < 3) {
    return 0;
  }

  return points.reduce((area, point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    return area + point.x * nextPoint.y - nextPoint.x * point.y;
  }, 0) / 2;
}

function boundsOverlap(left: PdfBounds, right: PdfBounds, tolerance: number): boolean {
  return left.x1 <= right.x2 + tolerance
    && left.x2 + tolerance >= right.x1
    && left.y1 <= right.y2 + tolerance
    && left.y2 + tolerance >= right.y1;
}

function boundsStrictlyContain(outer: PdfBounds, inner: PdfBounds): boolean {
  return outer.x1 < inner.x1 - GEOMETRY_EPSILON
    && outer.y1 < inner.y1 - GEOMETRY_EPSILON
    && outer.x2 > inner.x2 + GEOMETRY_EPSILON
    && outer.y2 > inner.y2 + GEOMETRY_EPSILON;
}

function orientation(first: Point, second: Point, third: Point): number {
  return (second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x);
}

function isPointOnSegment(point: Point, start: Point, end: Point): boolean {
  return Math.abs(orientation(start, end, point)) <= GEOMETRY_EPSILON
    && point.x >= Math.min(start.x, end.x) - GEOMETRY_EPSILON
    && point.x <= Math.max(start.x, end.x) + GEOMETRY_EPSILON
    && point.y >= Math.min(start.y, end.y) - GEOMETRY_EPSILON
    && point.y <= Math.max(start.y, end.y) + GEOMETRY_EPSILON;
}

function pointDistanceToSegment(point: Point, start: Point, end: Point): number {
  const lengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  if (lengthSquared <= GEOMETRY_EPSILON ** 2) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.max(0, Math.min(1,
    ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y))
      / lengthSquared,
  ));
  const projectedPoint = {
    x: start.x + projection * (end.x - start.x),
    y: start.y + projection * (end.y - start.y),
  };
  return Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y);
}

function segmentsIntersect(leftStart: Point, leftEnd: Point, rightStart: Point, rightEnd: Point): boolean {
  const leftStartSide = orientation(rightStart, rightEnd, leftStart);
  const leftEndSide = orientation(rightStart, rightEnd, leftEnd);
  const rightStartSide = orientation(leftStart, leftEnd, rightStart);
  const rightEndSide = orientation(leftStart, leftEnd, rightEnd);

  if (((leftStartSide > GEOMETRY_EPSILON && leftEndSide < -GEOMETRY_EPSILON)
    || (leftStartSide < -GEOMETRY_EPSILON && leftEndSide > GEOMETRY_EPSILON))
    && ((rightStartSide > GEOMETRY_EPSILON && rightEndSide < -GEOMETRY_EPSILON)
      || (rightStartSide < -GEOMETRY_EPSILON && rightEndSide > GEOMETRY_EPSILON))) {
    return true;
  }

  return isPointOnSegment(leftStart, rightStart, rightEnd)
    || isPointOnSegment(leftEnd, rightStart, rightEnd)
    || isPointOnSegment(rightStart, leftStart, leftEnd)
    || isPointOnSegment(rightEnd, leftStart, leftEnd);
}

function segmentsAreClose(left: Segment, right: Segment, tolerance: number): boolean {
  if (segmentsIntersect(left[0], left[1], right[0], right[1])) {
    return true;
  }

  return Math.min(
    pointDistanceToSegment(left[0], right[0], right[1]),
    pointDistanceToSegment(left[1], right[0], right[1]),
    pointDistanceToSegment(right[0], left[0], left[1]),
    pointDistanceToSegment(right[1], left[0], left[1]),
  ) <= tolerance;
}

function buildSegments(points: Point[], closed: boolean): Segment[] {
  const segments = points.slice(1).map((point, index): Segment => [points[index], point]);
  if (closed && points.length > 2) {
    segments.push([points[points.length - 1], points[0]]);
  }
  return segments;
}

function pointInClosedSubpath(
  point: Point,
  subpath: SubpathInfo,
  tolerance = GEOMETRY_EPSILON,
): boolean {
  if (!subpath.closed || subpath.points.length < 3) {
    return false;
  }

  if (subpath.segments.some(([start, end]) => pointDistanceToSegment(point, start, end) <= tolerance)) {
    return true;
  }

  let inside = false;
  for (let index = 0, previous = subpath.points.length - 1; index < subpath.points.length; previous = index, index += 1) {
    const currentPoint = subpath.points[index];
    const previousPoint = subpath.points[previous];
    const crossesRay = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < (previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)
        / (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crossesRay) {
      inside = !inside;
    }
  }
  return inside;
}

function subpathsConnect(left: SubpathInfo, right: SubpathInfo, tolerance: number): boolean {
  if (!boundsOverlap(left.bounds, right.bounds, tolerance)) {
    return false;
  }

  const intersects = left.segments.some((leftSegment) =>
    right.segments.some((rightSegment) => segmentsAreClose(leftSegment, rightSegment, tolerance)),
  );
  if (intersects) {
    return true;
  }

  return (boundsStrictlyContain(left.bounds, right.bounds)
      && pointInClosedSubpath(right.points[0], left, tolerance))
    || (boundsStrictlyContain(right.bounds, left.bounds)
      && pointInClosedSubpath(left.points[0], right, tolerance));
}

function unionBounds(bounds: PdfBounds[]): PdfBounds {
  return {
    x1: Math.min(...bounds.map((item) => item.x1)),
    y1: Math.min(...bounds.map((item) => item.y1)),
    x2: Math.max(...bounds.map((item) => item.x2)),
    y2: Math.max(...bounds.map((item) => item.y2)),
  };
}

function groupSubpaths(
  subpaths: PdfVectorSubpath[],
  page: number,
  pairedSystems: PairedStaffSystem[],
): SubpathGroup[] {
  const infos = subpaths.flatMap((subpath, index): SubpathInfo[] => {
    const bounds = getSubpathBounds(subpath);
    if (!bounds) {
      return [];
    }
    const tolerance = getSystemGeometryTolerance(bounds, page, pairedSystems);
    const points = flattenSubpath(subpath, tolerance);
    return [{
      index,
      bounds,
      points,
      segments: buildSegments(points, subpath.closed),
      closed: subpath.closed,
      signedArea: getSignedArea(points),
    }];
  });
  const parents = infos.map((_info, index) => index);

  const findRoot = (index: number): number => {
    let root = index;
    while (parents[root] !== root) {
      root = parents[root];
    }
    while (parents[index] !== index) {
      const next = parents[index];
      parents[index] = root;
      index = next;
    }
    return root;
  };

  for (let leftIndex = 0; leftIndex < infos.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < infos.length; rightIndex += 1) {
      const tolerance = getSystemGeometryTolerance(
        unionBounds([infos[leftIndex].bounds, infos[rightIndex].bounds]),
        page,
        pairedSystems,
      );
      if (subpathsConnect(infos[leftIndex], infos[rightIndex], tolerance)) {
        parents[findRoot(rightIndex)] = findRoot(leftIndex);
      }
    }
  }

  const groups = new Map<number, SubpathInfo[]>();
  infos.forEach((info, index) => {
    const root = findRoot(index);
    groups.set(root, [...(groups.get(root) ?? []), info]);
  });

  return [...groups.values()]
    .map((group) => ({
      index: Math.min(...group.map((subpath) => subpath.index)),
      subpaths: group.sort((left, right) => left.index - right.index),
      bounds: unionBounds(group.map((subpath) => subpath.bounds)),
    }))
    .sort((left, right) => left.index - right.index);
}

function groupHasHole(group: SubpathGroup, fillRule: PdfPaintedShape['fillRule']): boolean {
  return group.subpaths.some((inner) => group.subpaths.some((outer) => {
    if (inner.index === outer.index
      || !boundsStrictlyContain(outer.bounds, inner.bounds)
      || !pointInClosedSubpath(inner.points[0], outer)) {
      return false;
    }

    return fillRule === 'evenodd'
      || (Math.abs(inner.signedArea) > GEOMETRY_EPSILON
        && Math.abs(outer.signedArea) > GEOMETRY_EPSILON
        && Math.sign(inner.signedArea) !== Math.sign(outer.signedArea));
  }));
}

function pointDistanceToLine(point: Point, start: Point, end: Point): number {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length <= GEOMETRY_EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  return Math.abs(orientation(start, end, point)) / length;
}

function isLinearStroke(group: SubpathGroup, averageStaffGap: number): boolean {
  if (group.subpaths.some((subpath) => subpath.closed)) {
    return false;
  }

  const points = group.subpaths.flatMap((subpath) => subpath.points);
  let endpoints: [Point, Point] | null = null;
  let maximumDistance = 0;
  points.forEach((left, leftIndex) => {
    points.slice(leftIndex + 1).forEach((right) => {
      const distance = Math.hypot(right.x - left.x, right.y - left.y);
      if (distance > maximumDistance) {
        maximumDistance = distance;
        endpoints = [left, right];
      }
    });
  });

  if (!endpoints || maximumDistance / averageStaffGap < MINIMUM_LINEAR_LENGTH_IN_STAFF_GAPS) {
    return false;
  }

  const [start, end] = endpoints as [Point, Point];
  return points.every((point) =>
    pointDistanceToLine(point, start, end) / averageStaffGap <= LINEAR_DEVIATION_IN_STAFF_GAPS,
  );
}

function getSystemIndex(bounds: PdfBounds, page: number, pairedSystems: PairedStaffSystem[]): number | null {
  const centerY = (bounds.y1 + bounds.y2) / 2;
  const candidates = pairedSystems.flatMap((system, systemIndex) => {
    if (system.page !== page || system.averageStaffGap <= 0) {
      return [];
    }

    const topLineY = Math.min(...system.standardLineYs);
    const bottomLineY = Math.max(...system.standardLineYs);
    const tabTopY = Math.min(...system.tabSystem.stringYs);
    const topBoundary = topLineY - system.averageStaffGap * SYSTEM_MARGIN_IN_STAFF_GAPS;
    const bottomBoundary = tabTopY > bottomLineY
      ? (bottomLineY + tabTopY) / 2
      : bottomLineY + system.averageStaffGap * SYSTEM_MARGIN_IN_STAFF_GAPS;
    const horizontalMargin = system.averageStaffGap;
    if (bounds.x1 < system.x1 - horizontalMargin
      || bounds.x2 > system.x2 + horizontalMargin
      || bounds.y1 < topBoundary
      || bounds.y2 > bottomBoundary) {
      return [];
    }

    const staffCenterY = (topLineY + bottomLineY) / 2;
    return [{ systemIndex, distance: Math.abs(centerY - staffCenterY) / system.averageStaffGap }];
  }).sort((left, right) => left.distance - right.distance || left.systemIndex - right.systemIndex);

  if (candidates.length !== 1) {
    return null;
  }
  return candidates[0].systemIndex;
}

function strokeQuality(strokeWidth: number | null, averageStaffGap: number): 'reliable' | 'uncertain' {
  if (strokeWidth === null || strokeWidth <= 0) {
    return 'uncertain';
  }
  return strokeWidth / averageStaffGap <= MAXIMUM_RELIABLE_STROKE_WIDTH_IN_STAFF_GAPS
    ? 'reliable'
    : 'uncertain';
}

function getSystemGeometryTolerance(
  bounds: PdfBounds,
  page: number,
  pairedSystems: PairedStaffSystem[],
): number {
  const systemIndex = getSystemIndex(bounds, page, pairedSystems);
  if (systemIndex === null) {
    return GEOMETRY_EPSILON;
  }
  return Math.max(
    GEOMETRY_EPSILON,
    pairedSystems[systemIndex].averageStaffGap * GEOMETRY_TOLERANCE_IN_STAFF_GAPS,
  );
}

export function normalizeNotationEvidence(input: NormalizeNotationEvidenceInput): NotationPrimitiveResult {
  const primitives: NotationPrimitive[] = [];
  const warnings: string[] = [];

  input.shapes.forEach((shape, shapeIndex) => {
    const sourceId = `shape-${shapeIndex}`;
    const groups = groupSubpaths(
      shape.subpaths,
      shape.page,
      input.pairedSystems,
    );
    let assignedGroupCount = 0;

    groups.forEach((group, groupIndex) => {
      const systemIndex = getSystemIndex(group.bounds, shape.page, input.pairedSystems);
      if (systemIndex === null) {
        return;
      }
      assignedGroupCount += 1;
      const averageStaffGap = input.pairedSystems[systemIndex].averageStaffGap;
      if (shape.paint !== 'fill' && isLinearStroke(group, averageStaffGap)) {
        primitives.push({
          id: `${sourceId}-segment-${groupIndex}`,
          kind: 'segment',
          page: shape.page,
          systemIndex,
          bounds: group.bounds,
          quality: strokeQuality(shape.strokeWidth, averageStaffGap),
          sourceIds: [sourceId],
        });
        return;
      }

      primitives.push({
        id: `${sourceId}-contour-${groupIndex}`,
        kind: 'contour',
        page: shape.page,
        systemIndex,
        bounds: group.bounds,
        closed: group.subpaths.every((subpath) => subpath.closed),
        hasHole: groupHasHole(group, shape.fillRule),
        filled: shape.paint === 'fill' || shape.paint === 'fill-stroke',
        quality: shape.paint === 'stroke'
          ? strokeQuality(shape.strokeWidth, averageStaffGap)
          : 'reliable',
        sourceIds: [sourceId],
      });
    });

    if (groups.length === 0) {
      warnings.push(`Ignored ${sourceId} because it has no usable subpaths.`);
    } else if (assignedGroupCount === 0) {
      warnings.push(`Ignored ${sourceId} because it is outside every paired standard-staff system.`);
    } else if (assignedGroupCount < groups.length) {
      warnings.push(`Ignored part of ${sourceId} because it is outside every paired standard-staff system.`);
    }
  });

  input.glyphs.forEach((glyph, glyphIndex) => {
    const sourceId = `glyph-${glyphIndex}`;
    const systemIndex = getSystemIndex(glyph.bounds, glyph.page, input.pairedSystems);
    if (systemIndex === null) {
      warnings.push(`Ignored ${sourceId} because it is outside every paired standard-staff system.`);
      return;
    }

    if (glyph.mapping === 'reliable' && glyph.semantic !== null) {
      primitives.push({
        id: sourceId,
        kind: 'glyph',
        page: glyph.page,
        systemIndex,
        bounds: { ...glyph.bounds },
        semantic: glyph.semantic,
        quality: 'reliable',
        sourceIds: [sourceId],
      });
      return;
    }

    primitives.push({
      id: sourceId,
      kind: 'unknown-glyph',
      page: glyph.page,
      systemIndex,
      bounds: { ...glyph.bounds },
      quality: 'uncertain',
      sourceIds: [sourceId],
    });
  });

  return { primitives, warnings };
}
