import type { PdfTextItem, TabFretPosition, TabGeometryResult, TabStaffSystem } from './toolbox.types';

const STRING_ROW_TOLERANCE = 3;
const MEASURE_BOUNDARY_TOLERANCE = 3;

interface MeasureAnchor {
  number: number;
  x: number;
}

interface StringRow {
  y: number;
  items: PdfTextItem[];
}

function getNumericValue(item: PdfTextItem): number | null {
  const text = item.text.trim();

  if (!/^\d{1,2}$/.test(text)) {
    return null;
  }

  const value = Number(text);
  return value >= 0 && value <= 24 ? value : null;
}

function getRawNumericValue(item: PdfTextItem): number | null {
  const text = item.text.trim();
  return /^\d{1,2}$/.test(text) ? Number(text) : null;
}

function findMeasureAnchors(items: PdfTextItem[], measureNumbers: number[]): MeasureAnchor[] {
  const expectedNumbers = new Set(measureNumbers);

  return items
    .filter((item) => Math.abs(item.fontSize - 8) <= 0.05)
    .map((item) => ({ item, number: Number(item.text.trim()) }))
    .filter(({ number }) => expectedNumbers.has(number))
    .sort((left, right) => left.item.x - right.item.x)
    .map(({ item, number }) => ({ number, x: item.x }));
}

function findStringRows(items: PdfTextItem[], anchors: MeasureAnchor[]): StringRow[] {
  const anchorPositions = new Set(anchors.map((anchor) => anchor.x));
  const rows: StringRow[] = [];

  items.forEach((item) => {
    if (getNumericValue(item) === null || anchorPositions.has(item.x)) {
      return;
    }

    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= STRING_ROW_TOLERANCE);
    if (row) {
      row.items.push(item);
      row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
      return;
    }

    rows.push({ y: item.y, items: [item] });
  });

  const sortedRows = rows.sort((left, right) => left.y - right.y);
  let bestRows: StringRow[] = [];
  let bestScore = -1;

  sortedRows.forEach((firstRow, firstIndex) => {
    sortedRows.slice(firstIndex + 5).forEach((lastRow) => {
      const gap = (lastRow.y - firstRow.y) / 5;
      if (gap <= STRING_ROW_TOLERANCE) {
        return;
      }

      const matchedRows = Array.from({ length: 6 }, (_, index) => {
        const targetY = firstRow.y + gap * index;
        return sortedRows.find((row) => Math.abs(row.y - targetY) <= STRING_ROW_TOLERANCE);
      });

      if (matchedRows.some((row) => !row) || new Set(matchedRows).size !== 6) {
        return;
      }

      const resolvedRows = matchedRows as StringRow[];
      const score = resolvedRows.reduce((total, row) => total + row.items.length, 0);
      if (score > bestScore) {
        bestRows = resolvedRows;
        bestScore = score;
      }
    });
  });

  return bestRows;
}

function findMeasureAssignment(x: number, anchors: MeasureAnchor[]): { number: number; confidence: 'high' | 'medium' } | null {
  for (let index = 0; index < anchors.length; index += 1) {
    const previousBoundary = index === 0 ? Number.NEGATIVE_INFINITY : (anchors[index - 1].x + anchors[index].x) / 2;
    const nextBoundary = index === anchors.length - 1 ? Number.POSITIVE_INFINITY : (anchors[index].x + anchors[index + 1].x) / 2;

    if (x >= previousBoundary && x < nextBoundary) {
      const isNearBoundary = Math.abs(x - previousBoundary) <= MEASURE_BOUNDARY_TOLERANCE
        || Math.abs(x - nextBoundary) <= MEASURE_BOUNDARY_TOLERANCE;

      return { number: anchors[index].number, confidence: isNearBoundary ? 'medium' : 'high' };
    }
  }

  return null;
}

export function locateTabFrets(
  textItems: PdfTextItem[],
  measureNumbers: number[],
  staffSystems: TabStaffSystem[] = [],
): TabGeometryResult {
  const positions: TabFretPosition[] = [];
  let ambiguousCount = 0;
  let outOfRangeCount = 0;
  let nearMeasureBoundaryCount = 0;
  const mediumConfidenceSystemKeys = new Set<string>();

  [...new Set(textItems.map((item) => item.page))].sort((left, right) => left - right).forEach((page) => {
    const pageItems = textItems.filter((item) => item.page === page);
    const anchors = findMeasureAnchors(pageItems, measureNumbers);
    const stringRows = findStringRows(pageItems, anchors);
    const pageStaffSystems = staffSystems.filter((system) => system.page === page);

    if (anchors.length === 0) {
      return;
    }

    pageItems.forEach((item) => {
      const rawValue = getRawNumericValue(item);
      const isMeasureAnchor = anchors.some((anchor) => anchor.x === item.x && anchor.number === rawValue);
      const measure = findMeasureAssignment(item.x, anchors);
      if (rawValue === null || isMeasureAnchor || measure === null) {
        return;
      }

      const matchingSystems = pageStaffSystems.filter((system) => item.x >= system.x1 && item.x <= system.x2);
      const vectorSystem = matchingSystems.length === 1 ? matchingSystems[0] : null;
      const stringYs = vectorSystem?.stringYs ?? (stringRows.length === 6 ? stringRows.map((row) => row.y) : null);
      const averageGap = vectorSystem?.averageStringGap ?? (stringYs ? (stringYs[5] - stringYs[0]) / 5 : 0);
      if (!stringYs || averageGap <= 0) {
        return;
      }

      const closestRowIndex = stringYs.reduce((closestIndex, y, index) =>
        Math.abs(y - item.y) < Math.abs(stringYs[closestIndex] - item.y) ? index : closestIndex,
      0);
      const rowDistance = Math.abs(stringYs[closestRowIndex] - item.y);
      const isWithinSystem = item.y >= stringYs[0] - averageGap / 2 && item.y <= stringYs[5] + averageGap / 2;

      if (rawValue > 24) {
        if (rowDistance <= STRING_ROW_TOLERANCE) {
          outOfRangeCount += 1;
        }
        return;
      }

      if (rowDistance > STRING_ROW_TOLERANCE) {
        if (isWithinSystem) {
          ambiguousCount += 1;
        }
        return;
      }

      positions.push({
        page,
        measureNumber: measure.number,
        stringNumber: (closestRowIndex + 1) as TabFretPosition['stringNumber'],
        fret: rawValue,
        x: item.x,
        y: item.y,
        confidence: measure.confidence === 'medium' || vectorSystem?.confidence === 'medium' ? 'medium' : 'high',
      });
      if (measure.confidence === 'medium') {
        nearMeasureBoundaryCount += 1;
      }
      if (vectorSystem?.confidence === 'medium') {
        mediumConfidenceSystemKeys.add(`${vectorSystem.page}:${vectorSystem.x1}:${vectorSystem.x2}:${vectorSystem.stringYs[0]}`);
      }
    });
  });

  positions.sort((left, right) => left.page - right.page || left.x - right.x || left.stringNumber - right.stringNumber);

  const warnings: string[] = [];
  if (outOfRangeCount > 0) {
    warnings.push(`Ignored ${outOfRangeCount} out-of-range tab fret candidate${outOfRangeCount === 1 ? '' : 's'}.`);
  }
  if (ambiguousCount > 0) {
    warnings.push(`Ignored ${ambiguousCount} ambiguous tab fret candidate${ambiguousCount === 1 ? '' : 's'}.`);
  }
  if (nearMeasureBoundaryCount > 0) {
    warnings.push(`${nearMeasureBoundaryCount} tab fret candidate${nearMeasureBoundaryCount === 1 ? ' was' : 's were'} near a measure boundary.`);
  }
  if (mediumConfidenceSystemKeys.size > 0) {
    warnings.push(`Used ${mediumConfidenceSystemKeys.size} medium-confidence tab staff system${mediumConfidenceSystemKeys.size === 1 ? '' : 's'}; review ${mediumConfidenceSystemKeys.size === 1 ? 'its' : 'their'} fret positions.`);
  }

  return { positions, warnings };
}
