import type { PairedStaffSystem, PdfLineSegment, TabStaffSystem } from './toolbox.types';

const HORIZONTAL_TOLERANCE = 1;
const MEDIUM_LENGTH_TOLERANCE_RATIO = 0.2;
const HIGH_LENGTH_TOLERANCE_RATIO = 0.05;
const GAP_TOLERANCE_RATIO = 0.2;
const MINIMUM_HORIZONTAL_OVERLAP_RATIO = 0.8;
const MAXIMUM_VERTICAL_STAFF_GAPS = 12;

interface StaffRow {
  x1: number;
  x2: number;
  y: number;
}

interface StandardStaffSystem {
  page: number;
  x1: number;
  x2: number;
  lineYs: PairedStaffSystem['standardLineYs'];
  averageGap: number;
  confidence: 'high' | 'medium';
}

function getAverage(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getMedian(values: number[]): number {
  const sortedValues = [...values].sort((left, right) => left - right);
  return sortedValues[Math.floor(sortedValues.length / 2)];
}

function getOverlapRatio(leftX1: number, leftX2: number, rightX1: number, rightX2: number): number {
  const overlap = Math.max(0, Math.min(leftX2, rightX2) - Math.max(leftX1, rightX1));
  const shorterWidth = Math.min(leftX2 - leftX1, rightX2 - rightX1);
  return shorterWidth > 0 ? overlap / shorterWidth : 0;
}

function mergeHorizontalSegments(segments: PdfLineSegment[]): StaffRow[] {
  const rows: Array<StaffRow & { count: number }> = [];

  segments
    .filter((segment) => Math.abs(segment.y2 - segment.y1) <= HORIZONTAL_TOLERANCE)
    .filter((segment) => Math.abs(segment.x2 - segment.x1) > 0)
    .sort((left, right) => (left.y1 + left.y2) / 2 - (right.y1 + right.y2) / 2)
    .forEach((segment) => {
      const y = (segment.y1 + segment.y2) / 2;
      const row = rows.find((candidate) => Math.abs(candidate.y - y) <= HORIZONTAL_TOLERANCE);
      if (row) {
        row.y = (row.y * row.count + y) / (row.count + 1);
        row.count += 1;
        row.x1 = Math.min(row.x1, segment.x1, segment.x2);
        row.x2 = Math.max(row.x2, segment.x1, segment.x2);
        return;
      }

      rows.push({
        count: 1,
        x1: Math.min(segment.x1, segment.x2),
        x2: Math.max(segment.x1, segment.x2),
        y,
      });
    });

  return rows.map(({ count: _count, ...row }) => row);
}

function isTabRow(row: StaffRow, tabSystems: TabStaffSystem[]): boolean {
  return tabSystems.some((system) =>
    system.stringYs.some((y) => Math.abs(row.y - y) <= HORIZONTAL_TOLERANCE)
    && getOverlapRatio(row.x1, row.x2, system.x1, system.x2) >= MINIMUM_HORIZONTAL_OVERLAP_RATIO,
  );
}

function continuesStaff(
  row: StaffRow | undefined,
  edgeRow: StaffRow,
  averageGap: number,
  medianLength: number,
  x1: number,
  x2: number,
): boolean {
  if (!row) {
    return false;
  }

  const gapTolerance = Math.max(HORIZONTAL_TOLERANCE, averageGap * GAP_TOLERANCE_RATIO);
  const rowLength = row.x2 - row.x1;
  return Math.abs(Math.abs(row.y - edgeRow.y) - averageGap) <= gapTolerance
    && Math.abs(rowLength - medianLength) / medianLength <= MEDIUM_LENGTH_TOLERANCE_RATIO
    && getOverlapRatio(row.x1, row.x2, x1, x2) >= MINIMUM_HORIZONTAL_OVERLAP_RATIO;
}

function findStandardStaffSystems(segments: PdfLineSegment[], tabSystems: TabStaffSystem[]): StandardStaffSystem[] {
  const rows = mergeHorizontalSegments(segments).filter((row) => !isTabRow(row, tabSystems));
  const systems: StandardStaffSystem[] = [];

  for (let index = 0; index <= rows.length - 5; index += 1) {
    const candidateRows = rows.slice(index, index + 5);
    const lengths = candidateRows.map((row) => row.x2 - row.x1);
    const medianLength = getMedian(lengths);
    const gaps = candidateRows.slice(1).map((row, rowIndex) => row.y - candidateRows[rowIndex].y);
    const averageGap = getAverage(gaps);
    const gapTolerance = Math.max(HORIZONTAL_TOLERANCE, averageGap * GAP_TOLERANCE_RATIO);
    const x1 = Math.min(...candidateRows.map((row) => row.x1));
    const x2 = Math.max(...candidateRows.map((row) => row.x2));
    const lengthDeviations = lengths.map((length) => Math.abs(length - medianLength) / medianLength);
    const gapDeviations = gaps.map((gap) => Math.abs(gap - averageGap));

    const hasComparableLengths = medianLength > 0
      && lengthDeviations.every((deviation) => deviation <= MEDIUM_LENGTH_TOLERANCE_RATIO);
    const hasEvenGaps = averageGap > 0 && gapDeviations.every((deviation) => deviation <= gapTolerance);
    if (!hasComparableLengths || !hasEvenGaps) {
      continue;
    }

    const hasPreviousLine = continuesStaff(rows[index - 1], candidateRows[0], averageGap, medianLength, x1, x2);
    const hasNextLine = continuesStaff(rows[index + 5], candidateRows[4], averageGap, medianLength, x1, x2);
    if (hasPreviousLine || hasNextLine) {
      continue;
    }

    const hasHighConfidence = lengthDeviations.every((deviation) => deviation <= HIGH_LENGTH_TOLERANCE_RATIO)
      && gapDeviations.every((deviation) => deviation <= HORIZONTAL_TOLERANCE);
    systems.push({
      page: segments[0].page,
      x1,
      x2,
      lineYs: candidateRows.map((row) => row.y) as PairedStaffSystem['standardLineYs'],
      averageGap,
      confidence: hasHighConfidence ? 'high' : 'medium',
    });
    index += 4;
  }

  return systems;
}

function pairStandardStaff(
  standardSystem: StandardStaffSystem,
  tabSystems: TabStaffSystem[],
): PairedStaffSystem | null {
  const bottomLineY = standardSystem.lineYs[4];
  const candidates = tabSystems
    .filter((tabSystem) => tabSystem.page === standardSystem.page)
    .map((tabSystem) => ({
      tabSystem,
      distance: Math.min(...tabSystem.stringYs) - bottomLineY,
    }))
    .filter(({ tabSystem, distance }) =>
      distance > 0
      && distance <= standardSystem.averageGap * MAXIMUM_VERTICAL_STAFF_GAPS
      && getOverlapRatio(standardSystem.x1, standardSystem.x2, tabSystem.x1, tabSystem.x2)
        >= MINIMUM_HORIZONTAL_OVERLAP_RATIO,
    )
    .sort((left, right) => left.distance - right.distance);

  if (candidates.length === 0) {
    return null;
  }

  const nearest = candidates[0];
  if (candidates[1] && Math.abs(candidates[1].distance - nearest.distance) <= HORIZONTAL_TOLERANCE) {
    return null;
  }

  return {
    page: standardSystem.page,
    x1: standardSystem.x1,
    x2: standardSystem.x2,
    standardLineYs: standardSystem.lineYs,
    averageStaffGap: standardSystem.averageGap,
    tabSystem: nearest.tabSystem,
    confidence: standardSystem.confidence === 'high' && nearest.tabSystem.confidence === 'high' ? 'high' : 'medium',
  };
}

export function findPairedStaffSystems(
  lineSegments: PdfLineSegment[],
  tabSystems: TabStaffSystem[],
): PairedStaffSystem[] {
  const segmentsByPage = new Map<number, PdfLineSegment[]>();
  lineSegments.forEach((segment) => {
    const pageSegments = segmentsByPage.get(segment.page) ?? [];
    pageSegments.push(segment);
    segmentsByPage.set(segment.page, pageSegments);
  });

  return [...segmentsByPage.entries()]
    .sort(([leftPage], [rightPage]) => leftPage - rightPage)
    .flatMap(([page, pageSegments]) => {
      const pageTabSystems = tabSystems.filter((tabSystem) => tabSystem.page === page);
      return findStandardStaffSystems(pageSegments, pageTabSystems)
        .map((standardSystem) => pairStandardStaff(standardSystem, pageTabSystems))
        .filter((pair): pair is PairedStaffSystem => pair !== null);
    });
}
