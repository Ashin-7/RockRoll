import type { PdfLineSegment, TabStaffSystem } from './toolbox.types';

const HORIZONTAL_TOLERANCE = 1;
const HIGH_LENGTH_TOLERANCE_RATIO = 0.05;
const MEDIUM_LENGTH_TOLERANCE_RATIO = 0.2;
const STRING_GAP_TOLERANCE = 1;

function getLength(segment: PdfLineSegment): number {
  return Math.abs(segment.x2 - segment.x1);
}

function getAverage(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getMedian(values: number[]): number {
  const sortedValues = [...values].sort((left, right) => left - right);
  return sortedValues[Math.floor(sortedValues.length / 2)];
}

interface VectorRow {
  page: number;
  x1: number;
  x2: number;
  y: number;
}

function mergeHorizontalSegments(segments: PdfLineSegment[]): VectorRow[] {
  const rows: Array<VectorRow & { count: number }> = [];

  segments
    .filter((segment) => Math.abs(segment.y2 - segment.y1) <= HORIZONTAL_TOLERANCE)
    .filter((segment) => getLength(segment) > 0)
    .sort((left, right) => left.y1 - right.y1)
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
        page: segment.page,
        x1: Math.min(segment.x1, segment.x2),
        x2: Math.max(segment.x1, segment.x2),
        y,
      });
    });

  return rows.map(({ count: _count, ...row }) => row);
}

function findPageSystems(segments: PdfLineSegment[]): TabStaffSystem[] {
  const horizontalRows = mergeHorizontalSegments(segments);
  const systems: TabStaffSystem[] = [];

  for (let index = 0; index <= horizontalRows.length - 6; index += 1) {
    const rows = horizontalRows.slice(index, index + 6);
    const lengths = rows.map((row) => row.x2 - row.x1);
    const medianLength = getMedian(lengths);
    const gaps = rows.slice(1).map((row, rowIndex) => row.y - rows[rowIndex].y);
    const averageGap = getAverage(gaps);
    const x1 = Math.min(...rows.map((row) => row.x1));
    const x2 = Math.max(...rows.map((row) => row.x2));

    const comparableLengthCount = lengths.filter((length) =>
      Math.abs(length - medianLength) / medianLength <= MEDIUM_LENGTH_TOLERANCE_RATIO,
    ).length;
    const maximumLengthDeviation = Math.max(...lengths.map((length) => Math.abs(length - medianLength) / medianLength));
    const hasComparableLengths = comparableLengthCount >= 5;
    const hasEvenGaps = averageGap > 0 && gaps.every((gap) => Math.abs(gap - averageGap) <= STRING_GAP_TOLERANCE);
    if (!hasComparableLengths || !hasEvenGaps || x2 <= x1) {
      continue;
    }

    systems.push({
      page: rows[0].page,
      x1,
      x2,
      stringYs: rows.map((row) => row.y) as TabStaffSystem['stringYs'],
      averageStringGap: averageGap,
      confidence: maximumLengthDeviation <= HIGH_LENGTH_TOLERANCE_RATIO ? 'high' : 'medium',
    });
    index += 5;
  }

  return systems;
}

export function findTabStaffSystems(segments: PdfLineSegment[]): TabStaffSystem[] {
  const segmentsByPage = new Map<number, PdfLineSegment[]>();
  segments.forEach((segment) => {
    const pageSegments = segmentsByPage.get(segment.page) ?? [];
    pageSegments.push(segment);
    segmentsByPage.set(segment.page, pageSegments);
  });

  return [...segmentsByPage.entries()]
    .sort(([leftPage], [rightPage]) => leftPage - rightPage)
    .flatMap(([, pageSegments]) => findPageSystems(pageSegments));
}
