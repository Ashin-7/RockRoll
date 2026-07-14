import type { PairedStaffSystem, PdfLineSegment, TabStaffSystem } from './toolbox.types';

const HORIZONTAL_TOLERANCE = 1;
const HORIZONTAL_SEGMENT_GAP_TOLERANCE = 3;
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
  const rowCandidates: Array<{ page: number; y: number; count: number; segments: HorizontalRow[] }> = [];

  segments
    .filter((segment) => Math.abs(segment.y2 - segment.y1) <= HORIZONTAL_TOLERANCE)
    .filter((segment) => Math.abs(segment.x2 - segment.x1) > 0)
    .sort((left, right) => left.page - right.page || left.y1 - right.y1)
    .forEach((segment) => {
      const y = (segment.y1 + segment.y2) / 2;
      const rowCandidate = rowCandidates.find(
        (candidate) => candidate.page === segment.page && Math.abs(candidate.y - y) <= HORIZONTAL_TOLERANCE,
      );
      const horizontalSegment: HorizontalRow = {
        page: segment.page,
        x1: Math.min(segment.x1, segment.x2),
        x2: Math.max(segment.x1, segment.x2),
        y,
      };
      if (rowCandidate) {
        rowCandidate.y = (rowCandidate.y * rowCandidate.count + y) / (rowCandidate.count + 1);
        rowCandidate.count += 1;
        rowCandidate.segments.push(horizontalSegment);
        return;
      }

      rowCandidates.push({
        count: 1,
        page: segment.page,
        y,
        segments: [horizontalSegment],
      });
    });

  return rowCandidates.flatMap((candidate) => {
    const rows: HorizontalRow[] = [];
    candidate.segments
      .sort((left, right) => left.x1 - right.x1 || left.x2 - right.x2)
      .forEach((segment) => {
        const row = rows[rows.length - 1];
        if (row && segment.x1 - row.x2 <= HORIZONTAL_SEGMENT_GAP_TOLERANCE) {
          row.x2 = Math.max(row.x2, segment.x2);
          return;
        }

        rows.push({ ...segment, y: candidate.y });
      });
    return rows;
  });
}

function groupRowsByHorizontalRegion(rows: HorizontalRow[]): HorizontalRow[][] {
  const regions: Array<{ page: number; x2: number; rows: HorizontalRow[] }> = [];

  [...rows]
    .sort((left, right) => left.page - right.page || left.x1 - right.x1 || left.y - right.y)
    .forEach((row) => {
      const region = regions.find(
        (candidate) =>
          candidate.page === row.page && row.x1 - candidate.x2 <= HORIZONTAL_SEGMENT_GAP_TOLERANCE,
      );
      if (region) {
        region.x2 = Math.max(region.x2, row.x2);
        region.rows.push(row);
        return;
      }

      regions.push({ page: row.page, x2: row.x2, rows: [row] });
    });

  return regions.map((region) => region.rows.sort((left, right) => left.y - right.y || left.x1 - right.x1));
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
    Math.abs(Math.abs(adjacentRow.y - edgeRow.y) - expectedGap) <= STAFF_GAP_TOLERANCE
  );
}

function findFiveLineSystems(lineSegments: PdfLineSegment[]): StandardStaffSystem[] {
  const rowRegions = groupRowsByHorizontalRegion(mergeHorizontalSegments(lineSegments));
  const systems: StandardStaffSystem[] = [];

  rowRegions.forEach((rows) => {
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
      const intersectionWidth =
        Math.min(...systemRows.map((row) => row.x2)) - Math.max(...systemRows.map((row) => row.x1));
      const minimumRowWidth = Math.min(...lengths);
      if (
        medianLength <= 0 ||
        comparableLengthCount < 4 ||
        minimumRowWidth <= 0 ||
        intersectionWidth / minimumRowWidth < MINIMUM_OVERLAP_RATIO
      ) {
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
  });

  return systems;
}

interface PairingCandidate {
  standard: StandardStaffSystem,
  tabSystem: TabStaffSystem;
  verticalGap: number;
}

function findNearestTabCandidate(
  standard: StandardStaffSystem,
  tabSystems: TabStaffSystem[],
): PairingCandidate | null {
  const eligibleTabs = tabSystems
    .map((tabSystem) => ({
      tabSystem,
      verticalGap: standard.lineYs[0] - tabSystem.stringYs[5],
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
    return null;
  }

  return { standard, ...eligibleTabs[0] };
}

function createPairedSystem(candidate: PairingCandidate): PairedStaffSystem {
  const { standard, tabSystem } = candidate;
  return {
    page: standard.page,
    x1: standard.x1,
    x2: standard.x2,
    standardLineYs: standard.lineYs,
    tabSystem,
    confidence: standard.confidence === 'high' && tabSystem.confidence === 'high' ? 'high' : 'medium',
  };
}

export function findPairedStaffSystems(
  lineSegments: PdfLineSegment[],
  tabSystems: TabStaffSystem[],
): PairedStaffSystem[] {
  const standardSystems = findFiveLineSystems(lineSegments);
  const candidates = standardSystems
    .map((standard) => findNearestTabCandidate(standard, tabSystems))
    .filter((candidate): candidate is PairingCandidate => candidate !== null);
  const candidatesByTab = new Map<TabStaffSystem, PairingCandidate[]>();
  candidates.forEach((candidate) => {
    const competing = candidatesByTab.get(candidate.tabSystem) ?? [];
    competing.push(candidate);
    candidatesByTab.set(candidate.tabSystem, competing);
  });

  return [...candidatesByTab.values()].flatMap((competing) => {
    const ordered = competing.sort((left, right) => left.verticalGap - right.verticalGap);
    if (ordered.length === 1) {
      return [createPairedSystem(ordered[0])];
    }

    const ambiguityThreshold = Math.max(
      ordered[0].standard.averageLineGap,
      ordered[1].standard.averageLineGap,
      ordered[0].tabSystem.averageStringGap,
    );
    return ordered[1].verticalGap - ordered[0].verticalGap > ambiguityThreshold
      ? [createPairedSystem(ordered[0])]
      : [];
  });
}
