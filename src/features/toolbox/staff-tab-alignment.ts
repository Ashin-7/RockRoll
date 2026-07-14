import type { PairedStaffSystem, PdfLineSegment, TabStaffSystem } from './toolbox.types';

const HORIZONTAL_TOLERANCE = 1;
const STAFF_GAP_TOLERANCE = 1;
const HIGH_LENGTH_TOLERANCE_RATIO = 0.05;
const MEDIUM_LENGTH_TOLERANCE_RATIO = 0.2;
const MINIMUM_OVERLAP_RATIO = 0.8;
const MAXIMUM_VERTICAL_GAP_MULTIPLIER = 6;

interface HorizontalRow {
  page: number;
  x1: number;
  x2: number;
  y: number;
}

interface StandardStaffSystem {
  page: number;
  x1: number;
  x2: number;
  lineYs: [number, number, number, number, number];
  averageLineGap: number;
  confidence: 'high' | 'medium';
}

function getAverage(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getMedian(values: number[]): number {
  const sortedValues = [...values].sort((left, right) => left - right);
  return sortedValues[Math.floor(sortedValues.length / 2)];
}

function getOverlapRatio(left: { x1: number; x2: number }, right: { x1: number; x2: number }): number {
  const overlap = Math.max(0, Math.min(left.x2, right.x2) - Math.max(left.x1, right.x1));
  const shorterWidth = Math.min(left.x2 - left.x1, right.x2 - right.x1);
  return shorterWidth > 0 ? overlap / shorterWidth : 0;
}

function mergeHorizontalSegments(segments: PdfLineSegment[]): HorizontalRow[] {
  const rows: Array<HorizontalRow & { count: number }> = [];

  segments
    .filter((segment) => Math.abs(segment.y2 - segment.y1) <= HORIZONTAL_TOLERANCE)
    .filter((segment) => Math.abs(segment.x2 - segment.x1) > 0)
    .sort((left, right) => left.page - right.page || left.y1 - right.y1)
    .forEach((segment) => {
      const y = (segment.y1 + segment.y2) / 2;
      const row = rows.find(
        (candidate) => candidate.page === segment.page && Math.abs(candidate.y - y) <= HORIZONTAL_TOLERANCE,
      );
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

function continuesStaffSpacing(
  adjacentRow: HorizontalRow | undefined,
  edgeRow: HorizontalRow,
  expectedGap: number,
): boolean {
  if (!adjacentRow || adjacentRow.page !== edgeRow.page) {
    return false;
  }

  return (
    Math.abs(Math.abs(adjacentRow.y - edgeRow.y) - expectedGap) <= STAFF_GAP_TOLERANCE &&
    getOverlapRatio(adjacentRow, edgeRow) >= MINIMUM_OVERLAP_RATIO
  );
}

function findFiveLineSystems(lineSegments: PdfLineSegment[]): StandardStaffSystem[] {
  const rows = mergeHorizontalSegments(lineSegments);
  const systems: StandardStaffSystem[] = [];

  for (let index = 0; index <= rows.length - 5; index += 1) {
    const systemRows = rows.slice(index, index + 5);
    if (systemRows.some((row) => row.page !== systemRows[0].page)) {
      continue;
    }

    const gaps = systemRows.slice(1).map((row, rowIndex) => row.y - systemRows[rowIndex].y);
    const minimumGap = Math.min(...gaps);
    const maximumGap = Math.max(...gaps);
    const averageGap = getAverage(gaps);
    if (minimumGap <= 0 || maximumGap - minimumGap > STAFF_GAP_TOLERANCE) {
      continue;
    }

    const lengths = systemRows.map((row) => row.x2 - row.x1);
    const medianLength = getMedian(lengths);
    const comparableLengthCount = lengths.filter(
      (length) => Math.abs(length - medianLength) / medianLength <= MEDIUM_LENGTH_TOLERANCE_RATIO,
    ).length;
    if (medianLength <= 0 || comparableLengthCount < 4) {
      continue;
    }

    if (
      continuesStaffSpacing(rows[index - 1], systemRows[0], averageGap) ||
      continuesStaffSpacing(rows[index + 5], systemRows[4], averageGap)
    ) {
      continue;
    }

    const maximumLengthDeviation = Math.max(
      ...lengths.map((length) => Math.abs(length - medianLength) / medianLength),
    );
    systems.push({
      page: systemRows[0].page,
      x1: Math.min(...systemRows.map((row) => row.x1)),
      x2: Math.max(...systemRows.map((row) => row.x2)),
      lineYs: systemRows.map((row) => row.y) as StandardStaffSystem['lineYs'],
      averageLineGap: averageGap,
      confidence: maximumLengthDeviation <= HIGH_LENGTH_TOLERANCE_RATIO ? 'high' : 'medium',
    });
    index += 4;
  }

  return systems;
}

function pairWithUniqueTabSystem(
  standard: StandardStaffSystem,
  tabSystems: TabStaffSystem[],
): PairedStaffSystem[] {
  const standardBottom = standard.lineYs[4];
  const eligibleTabs = tabSystems
    .map((tabSystem) => ({
      tabSystem,
      verticalGap: tabSystem.stringYs[0] - standardBottom,
    }))
    .filter(({ tabSystem, verticalGap }) => {
      const maximumVerticalGap =
        MAXIMUM_VERTICAL_GAP_MULTIPLIER * Math.max(standard.averageLineGap, tabSystem.averageStringGap);
      return (
        tabSystem.page === standard.page &&
        verticalGap > 0 &&
        verticalGap <= maximumVerticalGap &&
        getOverlapRatio(standard, tabSystem) >= MINIMUM_OVERLAP_RATIO
      );
    })
    .sort((left, right) => left.verticalGap - right.verticalGap);

  if (eligibleTabs.length === 0 || eligibleTabs[1]?.verticalGap === eligibleTabs[0].verticalGap) {
    return [];
  }

  const tabSystem = eligibleTabs[0].tabSystem;
  return [
    {
      page: standard.page,
      x1: standard.x1,
      x2: standard.x2,
      standardLineYs: standard.lineYs,
      tabSystem,
      confidence: standard.confidence === 'high' && tabSystem.confidence === 'high' ? 'high' : 'medium',
    },
  ];
}

export function findPairedStaffSystems(
  lineSegments: PdfLineSegment[],
  tabSystems: TabStaffSystem[],
): PairedStaffSystem[] {
  const standardSystems = findFiveLineSystems(lineSegments);
  return standardSystems.flatMap((standard) => pairWithUniqueTabSystem(standard, tabSystems));
}
