import type { PdfLineSegment, TabStaffSystem } from './toolbox.types';

const HORIZONTAL_TOLERANCE = 1;
const HIGH_LENGTH_TOLERANCE_RATIO = 0.05;
const MEDIUM_LENGTH_TOLERANCE_RATIO = 0.2;
const MINIMUM_PAGE_SPAN_RATIO = 0.15;
const MINIMUM_ROW_COVERAGE_RATIO = 0.8;
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
  coverageRatio: number;
}

function mergeHorizontalSegments(segments: PdfLineSegment[]): VectorRow[] {
  const rows: Array<{
    page: number;
    y: number;
    count: number;
    intervals: Array<[number, number]>;
  }> = [];

  segments
    .filter((segment) => Math.abs(segment.y2 - segment.y1) <= HORIZONTAL_TOLERANCE)
    .filter((segment) => getLength(segment) > 0)
    .sort((left, right) => left.y1 - right.y1)
    .forEach((segment) => {
      const y = (segment.y1 + segment.y2) / 2;
      const row = rows.find((candidate) => Math.abs(candidate.y - y) <= HORIZONTAL_TOLERANCE);
      const interval: [number, number] = [
        Math.min(segment.x1, segment.x2),
        Math.max(segment.x1, segment.x2),
      ];
      if (row) {
        row.y = (row.y * row.count + y) / (row.count + 1);
        row.count += 1;
        row.intervals.push(interval);
        return;
      }

      rows.push({
        count: 1,
        page: segment.page,
        y,
        intervals: [interval],
      });
    });

  return rows.map((row) => {
    const intervals = [...row.intervals].sort((left, right) => left[0] - right[0]);
    const mergedIntervals: Array<[number, number]> = [];
    intervals.forEach((interval) => {
      const previous = mergedIntervals[mergedIntervals.length - 1];
      if (previous && interval[0] <= previous[1]) {
        previous[1] = Math.max(previous[1], interval[1]);
        return;
      }
      mergedIntervals.push([...interval]);
    });

    const x1 = intervals[0][0];
    const x2 = Math.max(...intervals.map((interval) => interval[1]));
    const coveredLength = mergedIntervals.reduce(
      (total, interval) => total + interval[1] - interval[0],
      0,
    );
    return {
      page: row.page,
      x1,
      x2,
      y: row.y,
      coverageRatio: x2 > x1 ? coveredLength / (x2 - x1) : 0,
    };
  });
}

function findPageSystems(segments: PdfLineSegment[]): TabStaffSystem[] {
  const mergedRows = mergeHorizontalSegments(segments);
  const maximumSpan = Math.max(0, ...mergedRows.map((row) => row.x2 - row.x1));
  const horizontalRows = mergedRows.filter((row) =>
    row.coverageRatio >= MINIMUM_ROW_COVERAGE_RATIO
    && row.x2 - row.x1 >= maximumSpan * MINIMUM_PAGE_SPAN_RATIO,
  );
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
