import type { NotationPrimitive } from './notation-primitives';
import type {
  PairedStaffSystem,
  PdfBounds,
  RhythmDuration,
} from './toolbox.types';

export interface RhythmTopologyEvent {
  page: number;
  systemIndex: number;
  x: number;
  duration: RhythmDuration;
  dots: 0 | 1;
  isRest: boolean;
  confidence: 'high' | 'medium';
  sourceSymbols: string[];
}

export interface RhythmTopologyResult {
  events: RhythmTopologyEvent[];
  warnings: string[];
}

type RelationKind = 'touches' | 'intersects' | 'contains' | 'aligned-with' | 'incident-to';
type ContourPrimitive = Extract<NotationPrimitive, { kind: 'contour' }>;
type GlyphPrimitive = Extract<NotationPrimitive, { kind: 'glyph' }>;

interface PrimitiveNode {
  index: number;
  primitive: NotationPrimitive;
}

interface PrimitiveGroup {
  page: number;
  systemIndex: number;
  system: PairedStaffSystem;
  nodes: PrimitiveNode[];
}

interface RelationGraph {
  has: (left: NotationPrimitive, right: NotationPrimitive, relation: RelationKind) => boolean;
}

interface NoteHead {
  primary: NotationPrimitive;
  primitives: NotationPrimitive[];
  fill: 'open' | 'filled';
  standaloneDuration: 'whole' | null;
  forbidsStem: boolean;
}

interface BeamGroup {
  primitives: NotationPrimitive[];
}

interface RhythmCandidate {
  event: RhythmTopologyEvent;
  channel: 'topology' | 'glyph';
  anchorBounds: PdfBounds;
  dotAnchorBounds: PdfBounds | null;
  sourcePrimitives: NotationPrimitive[];
}

const RELATION_TOLERANCE_IN_STAFF_GAPS = 0.08;
const ALIGNMENT_TOLERANCE_IN_STAFF_GAPS = 0.3;
const STEM_END_ZONE_IN_STAFF_GAPS = 1.25;
const LOCAL_EVENT_X_IN_STAFF_GAPS = 0.6;
const LOCAL_EVENT_Y_IN_STAFF_GAPS = 0.75;
const OVERLAPPING_VOICE_X_IN_STAFF_GAPS = 0.2;
const DOT_MIN_RIGHT_IN_STAFF_GAPS = 0.1;
const DOT_MAX_RIGHT_IN_STAFF_GAPS = 1.5;
const DOT_VERTICAL_COMPATIBILITY_IN_STAFF_GAPS = 0.35;
const DOT_STACCATO_AMBIGUITY_IN_STAFF_GAPS = 1.25;
const EPSILON = 1e-7;

const directNoteDurations: Partial<Record<GlyphPrimitive['semantic'], RhythmDuration>> = {
  'note-whole': 'whole',
  'note-half': 'half',
  'note-quarter': 'quarter',
  'note-eighth': 'eighth',
  'note-16th': '16th',
};

const directRestDurations: Partial<Record<GlyphPrimitive['semantic'], RhythmDuration>> = {
  'rest-whole': 'whole',
  'rest-half': 'half',
  'rest-quarter': 'quarter',
  'rest-eighth': 'eighth',
  'rest-16th': '16th',
};

function width(bounds: PdfBounds): number {
  return Math.max(0, bounds.x2 - bounds.x1);
}

function height(bounds: PdfBounds): number {
  return Math.max(0, bounds.y2 - bounds.y1);
}

function centerX(bounds: PdfBounds): number {
  return (bounds.x1 + bounds.x2) / 2;
}

function centerY(bounds: PdfBounds): number {
  return (bounds.y1 + bounds.y2) / 2;
}

function unionBounds(bounds: PdfBounds[]): PdfBounds {
  return bounds.slice(1).reduce((result, current) => ({
    x1: Math.min(result.x1, current.x1),
    y1: Math.min(result.y1, current.y1),
    x2: Math.max(result.x2, current.x2),
    y2: Math.max(result.y2, current.y2),
  }), bounds[0]);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function primitiveSourceSymbols(primitives: NotationPrimitive[]): string[] {
  return uniqueStrings(primitives.flatMap((primitive) => [primitive.id, ...primitive.sourceIds]));
}

function formatCoordinate(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function area(bounds: PdfBounds): number {
  return width(bounds) * height(bounds);
}

function axisDistance(firstStart: number, firstEnd: number, secondStart: number, secondEnd: number): number {
  return Math.max(0, firstStart - secondEnd, secondStart - firstEnd);
}

function boundsDistance(left: PdfBounds, right: PdfBounds): number {
  return Math.hypot(
    axisDistance(left.x1, left.x2, right.x1, right.x2),
    axisDistance(left.y1, left.y2, right.y1, right.y2),
  );
}

function boundsIntersect(left: PdfBounds, right: PdfBounds): boolean {
  return left.x1 <= right.x2 + EPSILON
    && left.x2 + EPSILON >= right.x1
    && left.y1 <= right.y2 + EPSILON
    && left.y2 + EPSILON >= right.y1;
}

function boundsContain(outer: PdfBounds, inner: PdfBounds): boolean {
  return outer.x1 < inner.x1 - EPSILON
    && outer.y1 < inner.y1 - EPSILON
    && outer.x2 > inner.x2 + EPSILON
    && outer.y2 > inner.y2 + EPSILON;
}

function pointToBoundsDistance(x: number, y: number, bounds: PdfBounds): number {
  const xDistance = Math.max(bounds.x1 - x, 0, x - bounds.x2);
  const yDistance = Math.max(bounds.y1 - y, 0, y - bounds.y2);
  return Math.hypot(xDistance, yDistance);
}

function relationKey(leftIndex: number, rightIndex: number, relation: RelationKind): string {
  return `${Math.min(leftIndex, rightIndex)}:${Math.max(leftIndex, rightIndex)}:${relation}`;
}

function buildRelationGraph(nodes: PrimitiveNode[], staffGap: number): RelationGraph {
  const relations = new Set<string>();
  const indexes = new Map<NotationPrimitive, number>();
  const relationTolerance = staffGap * RELATION_TOLERANCE_IN_STAFF_GAPS;
  const alignmentTolerance = staffGap * ALIGNMENT_TOLERANCE_IN_STAFF_GAPS;

  nodes.forEach((node) => indexes.set(node.primitive, node.index));
  nodes.forEach((left, leftOffset) => {
    nodes.slice(leftOffset + 1).forEach((right) => {
      const leftBounds = left.primitive.bounds;
      const rightBounds = right.primitive.bounds;
      const intersects = boundsIntersect(leftBounds, rightBounds);
      const touches = intersects || boundsDistance(leftBounds, rightBounds) <= relationTolerance;

      if (touches) {
        relations.add(relationKey(left.index, right.index, 'touches'));
        relations.add(relationKey(left.index, right.index, 'incident-to'));
      }
      if (intersects) {
        relations.add(relationKey(left.index, right.index, 'intersects'));
      }
      if (boundsContain(leftBounds, rightBounds) || boundsContain(rightBounds, leftBounds)) {
        relations.add(relationKey(left.index, right.index, 'contains'));
      }
      if (Math.abs(centerX(leftBounds) - centerX(rightBounds)) <= alignmentTolerance
        || Math.abs(centerY(leftBounds) - centerY(rightBounds)) <= alignmentTolerance) {
        relations.add(relationKey(left.index, right.index, 'aligned-with'));
      }
    });
  });

  return {
    has(left, right, relation) {
      const leftIndex = indexes.get(left);
      const rightIndex = indexes.get(right);
      return leftIndex !== undefined
        && rightIndex !== undefined
        && relations.has(relationKey(leftIndex, rightIndex, relation));
    },
  };
}

function buildPrimitiveGroups(
  primitives: NotationPrimitive[],
  pairedSystems: PairedStaffSystem[],
  warnings: string[],
): PrimitiveGroup[] {
  const groups = new Map<string, PrimitiveGroup>();

  primitives.forEach((primitive, index) => {
    const system = pairedSystems[primitive.systemIndex];
    if (!system || system.page !== primitive.page || system.averageStaffGap <= 0) {
      warnings.push(`Ignored ${primitive.id} because its paired staff system is unavailable.`);
      return;
    }

    const key = `${primitive.page}:${primitive.systemIndex}`;
    const group = groups.get(key) ?? {
      page: primitive.page,
      systemIndex: primitive.systemIndex,
      system,
      nodes: [],
    };
    group.nodes.push({ index, primitive });
    groups.set(key, group);
  });

  return [...groups.values()].sort((left, right) =>
    left.page - right.page || left.systemIndex - right.systemIndex,
  );
}

function isReliablePathPrimitive(primitive: NotationPrimitive): boolean {
  return (primitive.kind === 'contour' || primitive.kind === 'segment')
    && primitive.quality === 'reliable';
}

function isNoteheadContour(primitive: NotationPrimitive, staffGap: number): primitive is ContourPrimitive {
  if (primitive.kind !== 'contour' || primitive.quality !== 'reliable' || !primitive.closed) {
    return false;
  }

  const normalizedWidth = width(primitive.bounds) / staffGap;
  const normalizedHeight = height(primitive.bounds) / staffGap;
  const aspectRatio = normalizedHeight > 0 ? normalizedWidth / normalizedHeight : 0;
  return normalizedWidth >= 0.45
    && normalizedWidth <= 2.2
    && normalizedHeight >= 0.35
    && normalizedHeight <= 1.6
    && aspectRatio >= 0.8
    && aspectRatio <= 2.8;
}

function collectNoteHeads(
  primitives: NotationPrimitive[],
  graph: RelationGraph,
  staffGap: number,
): NoteHead[] {
  const contourCandidates = primitives
    .filter((primitive) => isNoteheadContour(primitive, staffGap))
    .sort((left, right) => area(right.bounds) - area(left.bounds) || left.id.localeCompare(right.id));
  const nestedChildren = new Set<NotationPrimitive>();
  const heads: NoteHead[] = [];

  contourCandidates.forEach((outer) => {
    if (nestedChildren.has(outer)) {
      return;
    }
    const innerContours = contourCandidates.filter((inner) =>
      inner !== outer
      && !nestedChildren.has(inner)
      && graph.has(outer, inner, 'contains')
      && boundsContain(outer.bounds, inner.bounds),
    );
    innerContours.forEach((inner) => nestedChildren.add(inner));
    const isOpen = outer.hasHole || !outer.filled || innerContours.length > 0;
    heads.push({
      primary: outer,
      primitives: [outer, ...innerContours],
      fill: isOpen ? 'open' : 'filled',
      standaloneDuration: isOpen ? 'whole' : null,
      forbidsStem: false,
    });
  });

  primitives.forEach((primitive) => {
    if (primitive.kind !== 'glyph') {
      return;
    }
    if (primitive.semantic === 'notehead-whole') {
      heads.push({
        primary: primitive,
        primitives: [primitive],
        fill: 'open',
        standaloneDuration: 'whole',
        forbidsStem: true,
      });
    } else if (primitive.semantic === 'notehead-half') {
      heads.push({
        primary: primitive,
        primitives: [primitive],
        fill: 'open',
        standaloneDuration: null,
        forbidsStem: false,
      });
    } else if (primitive.semantic === 'notehead-filled') {
      heads.push({
        primary: primitive,
        primitives: [primitive],
        fill: 'filled',
        standaloneDuration: null,
        forbidsStem: false,
      });
    }
  });

  return heads.sort((left, right) =>
    centerX(left.primary.bounds) - centerX(right.primary.bounds)
      || centerY(left.primary.bounds) - centerY(right.primary.bounds),
  );
}

function isStem(primitive: NotationPrimitive, staffGap: number): boolean {
  if (!isReliablePathPrimitive(primitive)) {
    return false;
  }
  const primitiveWidth = width(primitive.bounds);
  const primitiveHeight = height(primitive.bounds);
  return primitiveHeight / staffGap >= 1.8
    && primitiveWidth / staffGap <= 0.45
    && primitiveHeight >= Math.max(staffGap * 1.8, primitiveWidth * 3.5);
}

function headIsIncidentToStem(
  head: NoteHead,
  stem: NotationPrimitive,
  graph: RelationGraph,
  staffGap: number,
): boolean {
  const tolerance = staffGap * RELATION_TOLERANCE_IN_STAFF_GAPS;
  const stemX = centerX(stem.bounds);
  const headBounds = head.primary.bounds;
  const horizontalDistance = Math.min(
    Math.abs(stemX - headBounds.x1),
    Math.abs(stemX - headBounds.x2),
  );
  return head.primitives.some((primitive) => graph.has(primitive, stem, 'incident-to'))
    && horizontalDistance <= tolerance + width(stem.bounds) / 2
    && centerY(headBounds) >= stem.bounds.y1 - tolerance
    && centerY(headBounds) <= stem.bounds.y2 + tolerance;
}

function isBeam(primitive: NotationPrimitive, staffGap: number): boolean {
  if (!isReliablePathPrimitive(primitive)) {
    return false;
  }
  const primitiveWidth = width(primitive.bounds);
  const primitiveHeight = height(primitive.bounds);
  return primitiveWidth / staffGap >= 1.2
    && primitiveHeight / staffGap <= 1.3
    && primitiveWidth >= Math.max(staffGap * 1.2, primitiveHeight * 2);
}

function buildBeamGroups(
  beams: NotationPrimitive[],
  graph: RelationGraph,
  staffGap: number,
): BeamGroup[] {
  const parents = beams.map((_beam, index) => index);
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

  beams.forEach((left, leftIndex) => {
    beams.slice(leftIndex + 1).forEach((right, rightOffset) => {
      const rightIndex = leftIndex + rightOffset + 1;
      if (graph.has(left, right, 'incident-to')
        && Math.abs(centerY(left.bounds) - centerY(right.bounds)) <= staffGap * 0.75) {
        parents[findRoot(rightIndex)] = findRoot(leftIndex);
      }
    });
  });

  const grouped = new Map<number, NotationPrimitive[]>();
  beams.forEach((beam, index) => {
    const root = findRoot(index);
    grouped.set(root, [...(grouped.get(root) ?? []), beam]);
  });
  return [...grouped.values()].map((group) => ({ primitives: group }));
}

function getFarStemEnd(stem: NotationPrimitive, heads: NoteHead[]): number {
  const averageHeadY = heads.reduce((sum, head) => sum + centerY(head.primary.bounds), 0) / heads.length;
  return Math.abs(stem.bounds.y1 - averageHeadY) >= Math.abs(stem.bounds.y2 - averageHeadY)
    ? stem.bounds.y1
    : stem.bounds.y2;
}

function beamIsIncidentToStemEnd(
  beam: BeamGroup,
  stem: NotationPrimitive,
  farStemEnd: number,
  graph: RelationGraph,
  staffGap: number,
): boolean {
  const tolerance = staffGap * RELATION_TOLERANCE_IN_STAFF_GAPS;
  const stemX = centerX(stem.bounds);
  return beam.primitives.some((primitive) =>
    graph.has(primitive, stem, 'incident-to')
    && axisDistance(stemX, stemX, primitive.bounds.x1, primitive.bounds.x2) <= tolerance
    && pointToBoundsDistance(stemX, farStemEnd, primitive.bounds)
      <= staffGap * STEM_END_ZONE_IN_STAFF_GAPS,
  );
}

function isPathFlag(primitive: NotationPrimitive, staffGap: number): boolean {
  if (!isReliablePathPrimitive(primitive)) {
    return false;
  }
  const primitiveWidth = width(primitive.bounds);
  const primitiveHeight = height(primitive.bounds);
  return primitiveWidth / staffGap >= 0.2
    && primitiveWidth / staffGap <= 1.8
    && primitiveHeight / staffGap >= 0.45
    && primitiveHeight / staffGap <= 2.2
    && primitiveHeight >= primitiveWidth * 1.1;
}

function flagLayerCount(primitive: NotationPrimitive): number {
  if (primitive.kind !== 'glyph') {
    return 1;
  }
  if (primitive.semantic === 'flag-eighth') {
    return 1;
  }
  return primitive.semantic === 'flag-16th' ? 2 : 0;
}

function flagIsIncidentToStemEnd(
  flag: NotationPrimitive,
  stem: NotationPrimitive,
  farStemEnd: number,
  graph: RelationGraph,
  staffGap: number,
): boolean {
  return graph.has(flag, stem, 'incident-to')
    && pointToBoundsDistance(centerX(stem.bounds), farStemEnd, flag.bounds)
      <= staffGap * STEM_END_ZONE_IN_STAFF_GAPS;
}

function candidateFromGlyph(
  glyph: GlyphPrimitive,
  duration: RhythmDuration,
  isRest: boolean,
  group: PrimitiveGroup,
): RhythmCandidate {
  return {
    event: {
      page: group.page,
      systemIndex: group.systemIndex,
      x: centerX(glyph.bounds),
      duration,
      dots: 0,
      isRest,
      confidence: group.system.confidence,
      sourceSymbols: uniqueStrings([glyph.semantic, ...primitiveSourceSymbols([glyph])]),
    },
    channel: 'glyph',
    anchorBounds: glyph.bounds,
    dotAnchorBounds: null,
    sourcePrimitives: [glyph],
  };
}

function candidateFromTopology(
  group: PrimitiveGroup,
  duration: RhythmDuration,
  x: number,
  isRest: boolean,
  sourceSymbols: string[],
  sourcePrimitives: NotationPrimitive[],
  anchorBounds: PdfBounds,
): RhythmCandidate {
  return {
    event: {
      page: group.page,
      systemIndex: group.systemIndex,
      x,
      duration,
      dots: 0,
      isRest,
      confidence: group.system.confidence,
      sourceSymbols: uniqueStrings([
        ...sourceSymbols,
        ...primitiveSourceSymbols(sourcePrimitives),
      ]),
    },
    channel: 'topology',
    anchorBounds,
    dotAnchorBounds: anchorBounds,
    sourcePrimitives,
  };
}

function candidatesShareLocalPosition(
  left: RhythmCandidate,
  right: RhythmCandidate,
  staffGap: number,
): boolean {
  return Math.abs(left.event.x - right.event.x) <= staffGap * LOCAL_EVENT_X_IN_STAFF_GAPS
    && axisDistance(
      left.anchorBounds.y1,
      left.anchorBounds.y2,
      right.anchorBounds.y1,
      right.anchorBounds.y2,
    ) <= staffGap * LOCAL_EVENT_Y_IN_STAFF_GAPS;
}

function buildCandidateClusters(
  candidates: RhythmCandidate[],
  staffGap: number,
): RhythmCandidate[][] {
  const remaining = new Set(candidates);
  const clusters: RhythmCandidate[][] = [];

  candidates.forEach((candidate) => {
    if (!remaining.has(candidate)) {
      return;
    }
    const cluster: RhythmCandidate[] = [];
    const pending = [candidate];
    remaining.delete(candidate);
    while (pending.length > 0) {
      const current = pending.shift() as RhythmCandidate;
      cluster.push(current);
      [...remaining].forEach((other) => {
        if (cluster.some((member) => candidatesShareLocalPosition(member, other, staffGap))) {
          remaining.delete(other);
          pending.push(other);
        }
      });
    }
    clusters.push(cluster);
  });

  return clusters;
}

function fuseRhythmCandidates(
  candidates: RhythmCandidate[],
  staffGap: number,
  warnings: string[],
): RhythmCandidate[] {
  return buildCandidateClusters(candidates, staffGap).flatMap((cluster) => {
    if (cluster.length === 1) {
      return cluster;
    }
    const topology = cluster.filter((candidate) => candidate.channel === 'topology');
    const glyphs = cluster.filter((candidate) => candidate.channel === 'glyph');
    const averageX = cluster.reduce((sum, candidate) => sum + candidate.event.x, 0) / cluster.length;

    if (topology.length === 1 && glyphs.length === 1) {
      const topologyCandidate = topology[0];
      const glyphCandidate = glyphs[0];
      if (topologyCandidate.event.duration !== glyphCandidate.event.duration
        || topologyCandidate.event.isRest !== glyphCandidate.event.isRest) {
        warnings.push(
          `Ignored local rhythm event near x=${formatCoordinate(averageX)} because strong topology and glyph semantics conflict.`,
        );
        return [];
      }
      return [{
        event: {
          ...topologyCandidate.event,
          sourceSymbols: uniqueStrings([
            ...topologyCandidate.event.sourceSymbols,
            ...glyphCandidate.event.sourceSymbols,
          ]),
          confidence: topologyCandidate.event.confidence === 'high'
            && glyphCandidate.event.confidence === 'high'
            ? 'high'
            : 'medium',
        },
        channel: 'topology',
        anchorBounds: topologyCandidate.anchorBounds,
        dotAnchorBounds: topologyCandidate.dotAnchorBounds,
        sourcePrimitives: uniquePrimitives([
          ...topologyCandidate.sourcePrimitives,
          ...glyphCandidate.sourcePrimitives,
        ]),
      }];
    }

    warnings.push(
      `Ignored overlapping rhythm voices near x=${formatCoordinate(averageX)} because one local position has multiple strong events.`,
    );
    return [];
  });
}

function rejectOverlappingVoiceCandidates(
  candidates: RhythmCandidate[],
  staffGap: number,
  warnings: string[],
): RhythmCandidate[] {
  const remaining = new Set(candidates);
  const accepted: RhythmCandidate[] = [];
  const tolerance = staffGap * OVERLAPPING_VOICE_X_IN_STAFF_GAPS;

  candidates.forEach((candidate) => {
    if (!remaining.has(candidate)) {
      return;
    }
    const cluster = [...remaining].filter((other) =>
      Math.abs(candidate.event.x - other.event.x) <= tolerance,
    );
    cluster.forEach((member) => remaining.delete(member));
    if (cluster.length === 1) {
      accepted.push(candidate);
      return;
    }
    const averageX = cluster.reduce((sum, member) => sum + member.event.x, 0) / cluster.length;
    warnings.push(
      `Ignored overlapping rhythm voices near x=${formatCoordinate(averageX)} because one local position has multiple strong events.`,
    );
  });

  return accepted;
}

function uniquePrimitives(primitives: NotationPrimitive[]): NotationPrimitive[] {
  return [...new Set(primitives)];
}

function dotRelation(
  candidate: RhythmCandidate,
  dot: GlyphPrimitive,
  staffGap: number,
): 'compatible' | 'staccato-ambiguous' | 'glyph-anchor-ambiguous' | null {
  const rightDistance = dot.bounds.x1 - candidate.anchorBounds.x2;
  if (rightDistance < staffGap * DOT_MIN_RIGHT_IN_STAFF_GAPS
    || rightDistance > staffGap * DOT_MAX_RIGHT_IN_STAFF_GAPS) {
    return null;
  }
  const verticalDistance = axisDistance(
    (candidate.dotAnchorBounds ?? candidate.anchorBounds).y1,
    (candidate.dotAnchorBounds ?? candidate.anchorBounds).y2,
    dot.bounds.y1,
    dot.bounds.y2,
  );
  if (candidate.dotAnchorBounds === null) {
    return verticalDistance <= staffGap * DOT_STACCATO_AMBIGUITY_IN_STAFF_GAPS
      ? 'glyph-anchor-ambiguous'
      : null;
  }
  if (verticalDistance <= staffGap * DOT_VERTICAL_COMPATIBILITY_IN_STAFF_GAPS) {
    return 'compatible';
  }
  return verticalDistance <= staffGap * DOT_STACCATO_AMBIGUITY_IN_STAFF_GAPS
    ? 'staccato-ambiguous'
    : null;
}

function attachLocalDots(
  candidates: RhythmCandidate[],
  dots: GlyphPrimitive[],
  staffGap: number,
  warnings: string[],
  usedPrimitives: Set<NotationPrimitive>,
): RhythmCandidate[] {
  const relations = candidates.map((candidate) => dots.flatMap((dot) => {
    const relation = dotRelation(candidate, dot, staffGap);
    return relation ? [{ dot, relation }] : [];
  }));
  const compatibleEventCount = new Map<GlyphPrimitive, number>();
  relations.forEach((candidateRelations) => {
    candidateRelations.forEach(({ dot, relation }) => {
      if (relation === 'compatible') {
        compatibleEventCount.set(dot, (compatibleEventCount.get(dot) ?? 0) + 1);
      }
    });
  });

  return candidates.map((candidate, index) => {
    const candidateRelations = relations[index];
    if (candidateRelations.length === 0) {
      return candidate;
    }
    candidateRelations.forEach(({ dot }) => usedPrimitives.add(dot));
    const compatible = candidateRelations.filter(({ relation }) => relation === 'compatible');
    const hasSharedDot = compatible.some(({ dot }) => (compatibleEventCount.get(dot) ?? 0) !== 1);
    if (candidateRelations.length === 1 && compatible.length === 1 && !hasSharedDot) {
      const dot = compatible[0].dot;
      return {
        ...candidate,
        event: {
          ...candidate.event,
          dots: 1,
          sourceSymbols: uniqueStrings([
            ...candidate.event.sourceSymbols,
            dot.semantic,
            ...primitiveSourceSymbols([dot]),
          ]),
        },
        sourcePrimitives: uniquePrimitives([...candidate.sourcePrimitives, dot]),
      };
    }

    const x = formatCoordinate(candidate.event.x);
    if (candidateRelations.some(({ relation }) => relation === 'glyph-anchor-ambiguous')) {
      warnings.push(
        `Kept local rhythm event near x=${x} as medium confidence because its glyph has no reliable dot anchor.`,
      );
    } else if (compatible.length === 0) {
      warnings.push(
        `Kept local rhythm event near x=${x} as medium confidence because its dot is vertically ambiguous with staccato.`,
      );
    } else {
      warnings.push(
        `Kept local rhythm event near x=${x} as medium confidence because its augmentation dot is not unique.`,
      );
    }
    return {
      ...candidate,
      event: { ...candidate.event, confidence: 'medium', dots: 0 },
    };
  });
}

function recognizePrimitiveGroup(group: PrimitiveGroup, warnings: string[]): RhythmTopologyEvent[] {
  const primitives = group.nodes.map((node) => node.primitive);
  const staffGap = group.system.averageStaffGap;
  const graph = buildRelationGraph(group.nodes, staffGap);
  const candidates: RhythmCandidate[] = [];
  const usedPrimitives = new Set<NotationPrimitive>();

  primitives.forEach((primitive) => {
    if (primitive.kind === 'unknown-glyph') {
      usedPrimitives.add(primitive);
      warnings.push(
        `Ignored unknown glyph ${primitive.id} because it cannot determine rhythm duration.`,
      );
      return;
    }
    if (primitive.kind !== 'glyph') {
      return;
    }
    const noteDuration = directNoteDurations[primitive.semantic];
    if (noteDuration) {
      usedPrimitives.add(primitive);
      if (height(primitive.bounds) / staffGap < 0.6) {
        warnings.push(
          `Ignored reliable glyph ${primitive.id} because grace-sized rhythm evidence is unsupported.`,
        );
        return;
      }
      candidates.push(candidateFromGlyph(primitive, noteDuration, false, group));
      return;
    }
    const restDuration = directRestDurations[primitive.semantic];
    if (restDuration) {
      usedPrimitives.add(primitive);
      candidates.push(candidateFromGlyph(primitive, restDuration, true, group));
    }
  });

  const analysisPrimitives = primitives;
  const heads = collectNoteHeads(analysisPrimitives, graph, staffGap);
  const headPrimitives = new Set(heads.flatMap((head) => head.primitives));
  const stems = analysisPrimitives.filter((primitive) =>
    !headPrimitives.has(primitive) && isStem(primitive, staffGap),
  );
  const stemHeads = new Map<NotationPrimitive, NoteHead[]>();
  const invalidStems = new Set<NotationPrimitive>();

  heads.forEach((head) => {
    const incidentStems = stems.filter((stem) => headIsIncidentToStem(head, stem, graph, staffGap));
    if (incidentStems.length === 1) {
      const stem = incidentStems[0];
      stemHeads.set(stem, [...(stemHeads.get(stem) ?? []), head]);
      return;
    }
    if (incidentStems.length > 1) {
      head.primitives.forEach((primitive) => usedPrimitives.add(primitive));
      incidentStems.forEach((stem) => invalidStems.add(stem));
      incidentStems.forEach((stem) => usedPrimitives.add(stem));
      warnings.push(`Ignored notehead ${head.primary.id} because its incident stem is ambiguous.`);
      return;
    }
    if (head.standaloneDuration === 'whole') {
      head.primitives.forEach((primitive) => usedPrimitives.add(primitive));
      candidates.push(candidateFromTopology(
        group,
        'whole',
        centerX(head.primary.bounds),
        false,
        ['open-notehead'],
        head.primitives,
        head.primary.bounds,
      ));
      return;
    }
    head.primitives.forEach((primitive) => usedPrimitives.add(primitive));
    warnings.push(
      `Ignored ${head.fill} notehead ${head.primary.id} because it has no unique incident stem.`,
    );
  });

  const stemSet = new Set(stems);
  const reservedPrimitives = new Set([...headPrimitives, ...stemSet]);
  const beamPrimitives = analysisPrimitives.filter((primitive) =>
    !reservedPrimitives.has(primitive) && isBeam(primitive, staffGap),
  );
  const beamGroups = buildBeamGroups(beamPrimitives, graph, staffGap);
  beamPrimitives.forEach((primitive) => reservedPrimitives.add(primitive));
  const flags = analysisPrimitives.filter((primitive) => {
    if (reservedPrimitives.has(primitive)) {
      return false;
    }
    return (primitive.kind === 'glyph'
      && (primitive.semantic === 'flag-eighth' || primitive.semantic === 'flag-16th'))
      || isPathFlag(primitive, staffGap);
  });

  stemHeads.forEach((attachedHeads, stem) => {
    if (invalidStems.has(stem)) {
      return;
    }
    const fills = new Set(attachedHeads.map((head) => head.fill));
    if (fills.size !== 1 || attachedHeads.some((head) => head.forbidsStem)) {
      usedPrimitives.add(stem);
      attachedHeads.flatMap((head) => head.primitives)
        .forEach((primitive) => usedPrimitives.add(primitive));
      warnings.push(`Ignored stem ${stem.id} because its attached noteheads have conflicting topology.`);
      return;
    }

    const farStemEnd = getFarStemEnd(stem, attachedHeads);
    const incidentBeams = beamGroups.filter((beam) =>
      beamIsIncidentToStemEnd(beam, stem, farStemEnd, graph, staffGap),
    );
    const incidentFlags = flags.filter((flag) =>
      flagIsIncidentToStemEnd(flag, stem, farStemEnd, graph, staffGap),
    );
    const flagLayers = incidentFlags.reduce((sum, flag) => sum + flagLayerCount(flag), 0);

    if ((incidentBeams.length > 0 && flagLayers > 0)
      || incidentBeams.length > 2
      || flagLayers > 2) {
      usedPrimitives.add(stem);
      attachedHeads.flatMap((head) => head.primitives)
        .forEach((primitive) => usedPrimitives.add(primitive));
      incidentBeams.flatMap((beam) => beam.primitives)
        .forEach((primitive) => usedPrimitives.add(primitive));
      incidentFlags.forEach((primitive) => usedPrimitives.add(primitive));
      warnings.push(`Ignored stem ${stem.id} because its beam or flag topology is conflicting.`);
      return;
    }

    const fill = attachedHeads[0].fill;
    const layerCount = incidentBeams.length || flagLayers;
    if (fill === 'open' && layerCount > 0) {
      usedPrimitives.add(stem);
      attachedHeads.flatMap((head) => head.primitives)
        .forEach((primitive) => usedPrimitives.add(primitive));
      incidentBeams.flatMap((beam) => beam.primitives)
        .forEach((primitive) => usedPrimitives.add(primitive));
      incidentFlags.forEach((primitive) => usedPrimitives.add(primitive));
      warnings.push(`Ignored stem ${stem.id} because an open notehead has beam or flag layers.`);
      return;
    }
    const duration: RhythmDuration = fill === 'open'
      ? 'half'
      : (['quarter', 'eighth', '16th'] as const)[layerCount];
    const sourceSymbols = [fill === 'open' ? 'open-notehead' : 'filled-notehead', 'stem'];
    for (let layer = 1; layer <= incidentBeams.length; layer += 1) {
      sourceSymbols.push(`beam-${layer}`);
    }
    for (let layer = 1; layer <= flagLayers; layer += 1) {
      sourceSymbols.push(`flag-${layer}`);
    }
    const sourcePrimitives = uniquePrimitives([
      ...attachedHeads.flatMap((head) => head.primitives),
      stem,
      ...incidentBeams.flatMap((beam) => beam.primitives),
      ...incidentFlags,
    ]);
    sourcePrimitives.forEach((primitive) => usedPrimitives.add(primitive));
    const anchorBounds = unionBounds(attachedHeads.map((head) => head.primary.bounds));
    candidates.push(candidateFromTopology(
      group,
      duration,
      attachedHeads.reduce((sum, head) => sum + centerX(head.primary.bounds), 0)
        / attachedHeads.length,
      false,
      sourceSymbols,
      sourcePrimitives,
      anchorBounds,
    ));
  });

  const fusedCandidates = fuseRhythmCandidates(candidates, staffGap, warnings);
  const unambiguousCandidates = rejectOverlappingVoiceCandidates(
    fusedCandidates,
    staffGap,
    warnings,
  );
  const dots = primitives.filter((primitive): primitive is GlyphPrimitive =>
    primitive.kind === 'glyph' && primitive.semantic === 'augmentation-dot',
  );
  const dottedCandidates = attachLocalDots(
    unambiguousCandidates,
    dots,
    staffGap,
    warnings,
    usedPrimitives,
  );

  primitives.forEach((primitive) => {
    if (isReliablePathPrimitive(primitive) && !usedPrimitives.has(primitive)) {
      warnings.push(
        `Ignored path primitive ${primitive.id} because it does not match a reliable rhythm topology.`,
      );
    }
  });

  return dottedCandidates.map((candidate) => candidate.event);
}

export function recognizeRhythmTopology(
  primitives: NotationPrimitive[],
  pairedSystems: PairedStaffSystem[],
): RhythmTopologyResult {
  const warnings: string[] = [];
  const groups = buildPrimitiveGroups(primitives, pairedSystems, warnings);
  const events = groups.flatMap((group) => recognizePrimitiveGroup(group, warnings));

  return {
    events: events.sort((left, right) =>
      left.page - right.page
        || left.systemIndex - right.systemIndex
        || left.x - right.x,
    ),
    warnings,
  };
}
