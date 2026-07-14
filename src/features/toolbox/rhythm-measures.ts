import type {
  MeasureRhythmResult,
  PairedStaffSystem,
  RecognizedRhythmEvent,
  RhythmDuration,
  RhythmGlyphEvent,
  TabFretEvent,
} from './toolbox.types';

interface BuildMeasureRhythmResultsInput {
  glyphs: RhythmGlyphEvent[];
  tabEvents: TabFretEvent[];
  pairedSystems: PairedStaffSystem[];
  measureNumbers: number[];
  beats: number;
  beatType: number;
}

interface ProvisionalMatch {
  glyph: RhythmGlyphEvent;
  tabEvent: TabFretEvent;
}

interface AcceptedMatch extends ProvisionalMatch {
  event: RecognizedRhythmEvent;
}

interface OrderedRhythmEvent {
  event: RecognizedRhythmEvent;
  systemIndex: number;
  x: number;
}

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

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function getEventUnits(event: Pick<RecognizedRhythmEvent, 'duration' | 'dots'>): number {
  const base = durationUnits[event.duration];
  return event.dots === 1 ? base + base / 2 : base;
}

function isTabEventInSystem(event: TabFretEvent, system: PairedStaffSystem): boolean {
  const halfGap = system.tabSystem.averageStringGap * 0.5;
  const minimumY = system.tabSystem.stringYs[0] - halfGap;
  const maximumY = system.tabSystem.stringYs[5] + halfGap;

  return (
    event.page === system.page &&
    event.x >= system.x1 &&
    event.x <= system.x2 &&
    event.positions.some(
      (position) =>
        position.page === system.page && position.y >= minimumY && position.y <= maximumY,
    )
  );
}

function getPairingTolerance(events: TabFretEvent[], system: PairedStaffSystem): number {
  const columnXs = [...new Set(events.map((event) => event.x))].sort((left, right) => left - right);
  if (columnXs.length === 1) {
    return system.tabSystem.averageStringGap * 0.5;
  }

  const gaps = columnXs.slice(1).map((x, index) => x - columnXs[index]);
  return getMedian(gaps) * 0.5;
}

function createRecognizedEvent(
  glyph: RhythmGlyphEvent,
  measureNumber: number,
  tabEventOrder: number | null,
  tabConfidence: TabFretEvent['confidence'] = 'high',
): RecognizedRhythmEvent {
  return {
    page: glyph.page,
    measureNumber,
    tabEventOrder,
    duration: glyph.duration,
    dots: glyph.dots,
    isRest: glyph.isRest,
    confidence:
      glyph.confidence === 'high' && tabConfidence === 'high' ? 'high' : 'medium',
    sourceSymbols: [...glyph.sourceSymbols],
  };
}

function addWarning(warnings: Map<number, string[]>, measureNumber: number, warning: string): void {
  const measureWarnings = warnings.get(measureNumber);
  if (measureWarnings) {
    measureWarnings.push(warning);
  }
}

function addWarningToMeasures(
  warnings: Map<number, string[]>,
  measureNumbers: Iterable<number>,
  warning: string,
): void {
  new Set(measureNumbers).forEach((measureNumber) => addWarning(warnings, measureNumber, warning));
}

export function buildMeasureRhythmResults(
  input: BuildMeasureRhythmResultsInput,
): MeasureRhythmResult[] {
  const { glyphs, tabEvents, pairedSystems, measureNumbers, beats, beatType } = input;
  const warnings = new Map(measureNumbers.map((measureNumber) => [measureNumber, [] as string[]]));
  const requestedMeasures = new Set(measureNumbers);
  const provisionalMatches: ProvisionalMatch[] = [];

  glyphs
    .filter((glyph) => !glyph.isRest)
    .forEach((glyph) => {
      const system = pairedSystems[glyph.systemIndex];
      if (!system || glyph.page !== system.page) {
        addWarningToMeasures(warnings, measureNumbers, '存在无法解析到配对谱表系统的节奏符号。');
        return;
      }

      const candidates = tabEvents.filter((event) => isTabEventInSystem(event, system));
      if (candidates.length === 0) {
        addWarningToMeasures(warnings, measureNumbers, '节奏符号所在系统没有可配对的 TAB 事件。');
        return;
      }

      const distances = candidates.map((event) => ({
        event,
        distance: Math.abs(event.x - glyph.x),
      }));
      const minimumDistance = Math.min(...distances.map(({ distance }) => distance));
      const nearest = distances.filter(({ distance }) => distance === minimumDistance);
      if (nearest.length !== 1) {
        addWarningToMeasures(
          warnings,
          nearest.map(({ event }) => event.measureNumber),
          '最近的 TAB 事件不唯一，未猜测节奏配对。',
        );
        return;
      }

      if (minimumDistance > getPairingTolerance(candidates, system)) {
        addWarning(warnings, nearest[0].event.measureNumber, '节奏符号与最近 TAB 事件的距离超出容差。');
        return;
      }

      provisionalMatches.push({ glyph, tabEvent: nearest[0].event });
    });

  const matchCounts = new Map<TabFretEvent, number>();
  provisionalMatches.forEach(({ tabEvent }) => {
    matchCounts.set(tabEvent, (matchCounts.get(tabEvent) ?? 0) + 1);
  });

  const acceptedMatches: AcceptedMatch[] = [];
  provisionalMatches.forEach((match) => {
    if (matchCounts.get(match.tabEvent) !== 1) {
      addWarning(warnings, match.tabEvent.measureNumber, '多个节奏符号指向同一 TAB 事件，配对不唯一。');
      return;
    }

    acceptedMatches.push({
      ...match,
      event: createRecognizedEvent(
        match.glyph,
        match.tabEvent.measureNumber,
        match.tabEvent.order,
        match.tabEvent.confidence,
      ),
    });
  });

  const orderedEvents: OrderedRhythmEvent[] = acceptedMatches.map(({ glyph, event }) => ({
    event,
    systemIndex: glyph.systemIndex,
    x: glyph.x,
  }));

  glyphs
    .filter((glyph) => glyph.isRest)
    .forEach((rest) => {
      const system = pairedSystems[rest.systemIndex];
      if (!system || rest.page !== system.page) {
        addWarningToMeasures(warnings, measureNumbers, '存在无法解析到配对谱表系统的休止符。');
        return;
      }

      const systemMatches = acceptedMatches.filter(
        ({ glyph }) => glyph.systemIndex === rest.systemIndex,
      );
      const left = systemMatches
        .filter(({ glyph }) => glyph.x < rest.x)
        .sort((a, b) => b.glyph.x - a.glyph.x)[0];
      const right = systemMatches
        .filter(({ glyph }) => glyph.x > rest.x)
        .sort((a, b) => a.glyph.x - b.glyph.x)[0];

      if (!left || !right) {
        const anchoredMeasures = [left?.tabEvent.measureNumber, right?.tabEvent.measureNumber].filter(
          (measureNumber): measureNumber is number => measureNumber !== undefined,
        );
        addWarningToMeasures(
          warnings,
          anchoredMeasures.length > 0 ? anchoredMeasures : measureNumbers,
          '休止符缺少同一系统内左右两侧的已确认非休止事件，未猜测小节归属。',
        );
        return;
      }

      if (left.tabEvent.measureNumber !== right.tabEvent.measureNumber) {
        addWarningToMeasures(
          warnings,
          [left.tabEvent.measureNumber, right.tabEvent.measureNumber],
          '休止符左右事件跨越不同小节，未猜测小节边界。',
        );
        return;
      }

      orderedEvents.push({
        event: createRecognizedEvent(rest, left.tabEvent.measureNumber, null),
        systemIndex: rest.systemIndex,
        x: rest.x,
      });
    });

  const matchedTabEvents = new Set(acceptedMatches.map(({ tabEvent }) => tabEvent));
  tabEvents
    .filter((event) => requestedMeasures.has(event.measureNumber))
    .filter((event) => pairedSystems.some((system) => isTabEventInSystem(event, system)))
    .filter((event) => !matchedTabEvents.has(event))
    .forEach((event) => {
      addWarning(warnings, event.measureNumber, 'TAB 事件缺少唯一对应的节奏符号。');
    });

  const capacity = beatType === 0 ? Number.NaN : beats * (32 / beatType);
  const hasSupportedCapacity = Number.isInteger(capacity) && capacity > 0;
  if (!hasSupportedCapacity) {
    addWarningToMeasures(warnings, measureNumbers, '拍号容量无法用整数个三十二分音符单位表示。');
  }

  return measureNumbers.map((measureNumber) => {
    const measureEvents = orderedEvents
      .filter(({ event }) => event.measureNumber === measureNumber)
      .sort((left, right) =>
        left.event.page - right.event.page ||
        left.systemIndex - right.systemIndex ||
        left.x - right.x,
      )
      .map(({ event }) => event);
    const measureWarnings = warnings.get(measureNumber) ?? [];
    const totalUnits = measureEvents.reduce((total, event) => total + getEventUnits(event), 0);

    if (measureEvents.some((event) => event.confidence !== 'high')) {
      measureWarnings.push('小节包含中置信度节奏事件。');
    }
    if (hasSupportedCapacity && totalUnits !== capacity) {
      measureWarnings.push(`小节时值总和为 ${totalUnits}，预期为 ${capacity} 个三十二分音符单位。`);
    }

    return {
      measureNumber,
      status: hasSupportedCapacity && measureWarnings.length === 0 ? 'recognized' : 'fallback',
      events: measureEvents,
      warning: measureWarnings.length === 0 ? null : measureWarnings.join('；'),
    };
  });
}
