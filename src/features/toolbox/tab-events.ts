import type { TabFretEvent, TabFretEventResult, TabFretPosition } from './toolbox.types';

function getMedian(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function getColumnTolerance(positions: TabFretPosition[]): number {
  const xValues = positions.map((position) => position.x).sort((left, right) => left - right);
  const gaps = xValues.slice(1).map((x, index) => x - xValues[index]).filter((gap) => gap > 0);

  return gaps.length === 0 ? 3 : Math.max(3, Math.min(12, getMedian(gaps) * 0.2));
}

function groupMeasurePositions(positions: TabFretPosition[]): TabFretEvent[] {
  const tolerance = getColumnTolerance(positions);
  const columns: TabFretPosition[][] = [];

  [...positions]
    .sort((left, right) => left.x - right.x || left.stringNumber - right.stringNumber)
    .forEach((position) => {
      const column = columns.find((candidate) => {
        const averageX = candidate.reduce((total, item) => total + item.x, 0) / candidate.length;
        return Math.abs(position.x - averageX) <= tolerance;
      });

      if (column) {
        column.push(position);
      } else {
        columns.push([position]);
      }
    });

  return columns.map((positionsInColumn, index) => ({
    page: positionsInColumn[0].page,
    measureNumber: positionsInColumn[0].measureNumber,
    order: index + 1,
    x: positionsInColumn.reduce((total, position) => total + position.x, 0) / positionsInColumn.length,
    positions: positionsInColumn.sort((left, right) => left.stringNumber - right.stringNumber),
    confidence: positionsInColumn.some((position) => position.confidence === 'medium') ? 'medium' : 'high',
  }));
}

export function groupTabFretEvents(positions: TabFretPosition[]): TabFretEventResult {
  const groups = new Map<string, TabFretPosition[]>();

  positions.forEach((position) => {
    const key = `${position.page}:${position.measureNumber}`;
    const group = groups.get(key) ?? [];
    group.push(position);
    groups.set(key, group);
  });

  const events = [...groups.values()]
    .flatMap(groupMeasurePositions)
    .sort((left, right) => left.page - right.page || left.measureNumber - right.measureNumber || left.order - right.order);

  const conflictingEvents = events.filter((event) => {
    const fretsByString = new Map<number, Set<number>>();
    event.positions.forEach((position) => {
      const frets = fretsByString.get(position.stringNumber) ?? new Set<number>();
      frets.add(position.fret);
      fretsByString.set(position.stringNumber, frets);
    });

    return [...fretsByString.values()].some((frets) => frets.size > 1);
  });
  conflictingEvents.forEach((event) => {
    event.confidence = 'medium';
  });

  const warnings = conflictingEvents.length > 0
    ? [`${conflictingEvents.length} tab fret event${conflictingEvents.length === 1 ? ' has' : 's have'} conflicting fret candidates on one string.`]
    : [];

  return { events, warnings };
}
