import type { RhythmTopologyEvent } from './rhythm-topology';
import type {
  MeasureRhythmResult,
  RecognizedRhythmEvent,
  RhythmDuration,
  TabFretEvent,
} from './toolbox.types';

export interface BuildMeasureRhythmResultsInput {
  events: RhythmTopologyEvent[];
  tabEvents: TabFretEvent[];
  measureNumbers: number[];
  beats: number;
  beatType: number;
}

interface IndexedTabEvent {
  event: TabFretEvent;
  index: number;
}

interface PendingRhythmEvent {
  event: RecognizedRhythmEvent;
  source: RhythmTopologyEvent;
}

type MeasureIssue = 'assignment' | 'confidence' | 'unique-tab-column' | 'one-to-one';

const durationUnits: Record<RhythmDuration, number> = {
  whole: 32,
  half: 16,
  quarter: 8,
  eighth: 4,
  '16th': 2,
};

function getMedian(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function getSelectionTolerance(tabEvents: IndexedTabEvent[]): number {
  const xValues = tabEvents
    .map(({ event }) => event.x)
    .sort((left, right) => left - right);
  const gaps = xValues
    .slice(1)
    .map((x, index) => x - xValues[index])
    .filter((gap) => gap > 0);

  return gaps.length === 0 ? 3 : Math.max(3, Math.min(12, getMedian(gaps) * 0.2));
}

function getMeasureCapacity(beats: number, beatType: number): number | null {
  if (
    !Number.isInteger(beats)
    || !Number.isInteger(beatType)
    || beats <= 0
    || beatType <= 0
    || beatType > 32
    || 32 % beatType !== 0
  ) {
    return null;
  }

  return beats * (32 / beatType);
}

function getEventUnits(event: RhythmTopologyEvent): number {
  const baseUnits = durationUnits[event.duration];
  return event.dots === 1 ? baseUnits + baseUnits / 2 : baseUnits;
}

function getUniqueNearestMeasure(
  event: RhythmTopologyEvent,
  tabEvents: IndexedTabEvent[],
  measureNumbers: number[],
): number | null {
  const requestedMeasures = new Set(measureNumbers);
  const pageEvents = tabEvents.filter(({ event: tabEvent }) => (
    tabEvent.page === event.page && requestedMeasures.has(tabEvent.measureNumber)
  ));
  const measures = [...new Set(pageEvents.map(({ event: tabEvent }) => tabEvent.measureNumber))];

  if (measures.length === 0) {
    return measureNumbers.length === 1 ? measureNumbers[0] : null;
  }
  if (measures.length === 1) {
    return measures[0];
  }

  return null;
}

function selectUniqueTabEvent(
  rhythmEvent: RhythmTopologyEvent,
  tabEvents: IndexedTabEvent[],
  groupedTabEvents: Map<string, IndexedTabEvent[]>,
  measureNumbers: number[],
): { match: IndexedTabEvent | null; affectedMeasures: number[]; ambiguous: boolean } {
  const requestedMeasures = new Set(measureNumbers);
  const pageEvents = tabEvents.filter(({ event }) => (
    event.page === rhythmEvent.page && requestedMeasures.has(event.measureNumber)
  ));
  const candidates = pageEvents.map((candidate) => {
    const key = `${candidate.event.page}:${candidate.event.measureNumber}`;
    const tolerance = getSelectionTolerance(groupedTabEvents.get(key) ?? [candidate]);
    return {
      candidate,
      distance: Math.abs(candidate.event.x - rhythmEvent.x),
      tolerance,
    };
  }).filter(({ distance, tolerance }) => distance <= tolerance)
    .sort((left, right) => left.distance - right.distance);

  if (candidates.length === 0) {
    const nearestMeasure = getUniqueNearestMeasure(rhythmEvent, tabEvents, measureNumbers);
    return {
      match: null,
      affectedMeasures: nearestMeasure === null ? measureNumbers : [nearestMeasure],
      ambiguous: false,
    };
  }

  const candidateMeasures = [...new Set(candidates.map(({ candidate }) => (
    candidate.event.measureNumber
  )))];
  if (candidateMeasures.length !== 1) {
    return {
      match: null,
      affectedMeasures: candidateMeasures,
      ambiguous: true,
    };
  }

  const nearestDistance = candidates[0].distance;
  const nearestCandidates = candidates.filter(({ distance }) => (
    Math.abs(distance - nearestDistance) <= 1e-6
  ));

  if (nearestCandidates.length !== 1) {
    return {
      match: null,
      affectedMeasures: [...new Set(nearestCandidates.map(({ candidate }) => (
        candidate.event.measureNumber
      )))],
      ambiguous: true,
    };
  }

  return {
    match: nearestCandidates[0].candidate,
    affectedMeasures: [nearestCandidates[0].candidate.event.measureNumber],
    ambiguous: false,
  };
}

function toRecognizedEvent(
  event: RhythmTopologyEvent,
  measureNumber: number,
  tabEventOrder: number | null,
): RecognizedRhythmEvent {
  return {
    page: event.page,
    measureNumber,
    tabEventOrder,
    duration: event.duration,
    dots: event.dots,
    isRest: event.isRest,
    confidence: event.confidence,
    sourceSymbols: [...event.sourceSymbols],
  };
}

function getIssueWarning(measureNumber: number, issues: Set<MeasureIssue>): string | null {
  if (issues.has('confidence')) {
    return `Measure ${measureNumber} contains rhythm or TAB events that are not high-confidence.`;
  }
  if (issues.has('unique-tab-column')) {
    return `Measure ${measureNumber} does not have a unique TAB column for every rhythm event.`;
  }
  if (issues.has('one-to-one')) {
    return `Measure ${measureNumber} does not have a one-to-one rhythm and TAB column match.`;
  }
  if (issues.has('assignment')) {
    return `Measure ${measureNumber} contains rhythm events that cannot be assigned safely.`;
  }

  return null;
}

export function buildMeasureRhythmResults({
  events,
  tabEvents,
  measureNumbers,
  beats,
  beatType,
}: BuildMeasureRhythmResultsInput): MeasureRhythmResult[] {
  const capacity = getMeasureCapacity(beats, beatType);
  const requestedMeasures = [...new Set(measureNumbers)];
  const requestedMeasureSet = new Set(requestedMeasures);
  const indexedTabEvents = tabEvents
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => requestedMeasureSet.has(event.measureNumber));
  const groupedTabEvents = new Map<string, IndexedTabEvent[]>();
  const pendingByMeasure = new Map<number, PendingRhythmEvent[]>();
  const issuesByMeasure = new Map<number, Set<MeasureIssue>>();
  const usedTabIndexesByMeasure = new Map<number, Set<number>>();

  indexedTabEvents.forEach((indexedEvent) => {
    const key = `${indexedEvent.event.page}:${indexedEvent.event.measureNumber}`;
    const group = groupedTabEvents.get(key) ?? [];
    group.push(indexedEvent);
    groupedTabEvents.set(key, group);

    if (indexedEvent.event.confidence !== 'high') {
      const issues = issuesByMeasure.get(indexedEvent.event.measureNumber) ?? new Set<MeasureIssue>();
      issues.add('confidence');
      issuesByMeasure.set(indexedEvent.event.measureNumber, issues);
    }
  });

  const addIssue = (measureNumber: number, issue: MeasureIssue) => {
    if (!requestedMeasureSet.has(measureNumber)) {
      return;
    }
    const issues = issuesByMeasure.get(measureNumber) ?? new Set<MeasureIssue>();
    issues.add(issue);
    issuesByMeasure.set(measureNumber, issues);
  };

  const addPendingEvent = (measureNumber: number, pendingEvent: PendingRhythmEvent) => {
    const pendingEvents = pendingByMeasure.get(measureNumber) ?? [];
    pendingEvents.push(pendingEvent);
    pendingByMeasure.set(measureNumber, pendingEvents);
  };

  events.forEach((event) => {
    if (event.isRest) {
      const measureNumber = getUniqueNearestMeasure(
        event,
        indexedTabEvents,
        requestedMeasures,
      );
      if (measureNumber === null) {
        requestedMeasures.forEach((number) => addIssue(number, 'assignment'));
        return;
      }

      addPendingEvent(measureNumber, {
        event: toRecognizedEvent(event, measureNumber, null),
        source: event,
      });
      if (event.confidence !== 'high') {
        addIssue(measureNumber, 'confidence');
      }
      return;
    }

    const selection = selectUniqueTabEvent(
      event,
      indexedTabEvents,
      groupedTabEvents,
      requestedMeasures,
    );
    if (selection.match === null) {
      const issue: MeasureIssue = selection.ambiguous ? 'unique-tab-column' : 'assignment';
      selection.affectedMeasures.forEach((number) => addIssue(number, issue));
      return;
    }

    const measureNumber = selection.match.event.measureNumber;
    addPendingEvent(measureNumber, {
      event: toRecognizedEvent(event, measureNumber, selection.match.event.order),
      source: event,
    });

    if (event.confidence !== 'high' || selection.match.event.confidence !== 'high') {
      addIssue(measureNumber, 'confidence');
    }

    const usedIndexes = usedTabIndexesByMeasure.get(measureNumber) ?? new Set<number>();
    if (usedIndexes.has(selection.match.index)) {
      addIssue(measureNumber, 'one-to-one');
    }
    usedIndexes.add(selection.match.index);
    usedTabIndexesByMeasure.set(measureNumber, usedIndexes);
  });

  return requestedMeasures.map((measureNumber) => {
    if (capacity === null) {
      return {
        measureNumber,
        status: 'fallback',
        events: [],
        warning: `Time signature ${beats}/${beatType} has no supported thirty-second-note capacity.`,
      };
    }

    const pendingEvents = pendingByMeasure.get(measureNumber) ?? [];
    const existingIssueWarning = getIssueWarning(
      measureNumber,
      issuesByMeasure.get(measureNumber) ?? new Set<MeasureIssue>(),
    );
    if (existingIssueWarning !== null) {
      return {
        measureNumber,
        status: 'fallback',
        events: [],
        warning: existingIssueWarning,
      };
    }
    if (pendingEvents.length === 0) {
      return {
        measureNumber,
        status: 'fallback',
        events: [],
        warning: `Measure ${measureNumber} has no rhythm events.`,
      };
    }

    const measureTabEvents = indexedTabEvents.filter(({ event }) => (
      event.measureNumber === measureNumber
    ));
    const usedTabIndexes = usedTabIndexesByMeasure.get(measureNumber) ?? new Set<number>();
    if (usedTabIndexes.size !== measureTabEvents.length) {
      addIssue(measureNumber, 'one-to-one');
    }

    const issueWarning = getIssueWarning(
      measureNumber,
      issuesByMeasure.get(measureNumber) ?? new Set<MeasureIssue>(),
    );
    if (issueWarning !== null) {
      return {
        measureNumber,
        status: 'fallback',
        events: [],
        warning: issueWarning,
      };
    }

    const totalUnits = pendingEvents.reduce((total, pendingEvent) => (
      total + getEventUnits(pendingEvent.source)
    ), 0);
    if (totalUnits !== capacity) {
      return {
        measureNumber,
        status: 'fallback',
        events: [],
        warning: `Measure ${measureNumber} rhythm capacity is ${totalUnits} thirty-second-note units; expected ${capacity}.`,
      };
    }

    return {
      measureNumber,
      status: 'recognized',
      events: pendingEvents
        .sort((left, right) => (
          left.source.page - right.source.page
          || left.source.systemIndex - right.source.systemIndex
          || left.source.x - right.source.x
        ))
        .map(({ event }) => event),
      warning: null,
    };
  });
}
