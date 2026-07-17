import { describe, expect, it } from 'vitest';
import { buildMeasureRhythmResults } from './rhythm-measures';
import type { RhythmTopologyEvent } from './rhythm-topology';
import type { RhythmDuration, TabFretEvent, TabFretPosition } from './toolbox.types';

function rhythmEvent(
  x: number,
  duration: RhythmDuration = 'quarter',
  overrides: Partial<RhythmTopologyEvent> = {},
): RhythmTopologyEvent {
  return {
    page: 1,
    systemIndex: 0,
    x,
    duration,
    dots: 0,
    isRest: false,
    confidence: 'high',
    sourceSymbols: [`symbol-${x}`],
    ...overrides,
  };
}

function fretPosition(
  x: number,
  stringNumber: TabFretPosition['stringNumber'] = 1,
  fret = 3,
): TabFretPosition {
  return {
    page: 1,
    measureNumber: 1,
    stringNumber,
    fret,
    x,
    y: stringNumber * 10,
    confidence: 'high',
  };
}

function tabEvent(
  order: number,
  x: number,
  overrides: Partial<TabFretEvent> = {},
): TabFretEvent {
  return {
    page: 1,
    measureNumber: 1,
    order,
    x,
    positions: [fretPosition(x)],
    confidence: 'high',
    ...overrides,
  };
}

function build(
  events: RhythmTopologyEvent[],
  tabEvents: TabFretEvent[],
  overrides: Partial<Parameters<typeof buildMeasureRhythmResults>[0]> = {},
) {
  return buildMeasureRhythmResults({
    events,
    tabEvents,
    measureNumbers: [1],
    beats: 4,
    beatType: 4,
    ...overrides,
  });
}

describe('buildMeasureRhythmResults', () => {
  it('pairs each non-rest event to the uniquely nearest TAB column and keeps all frets in that column', () => {
    const tabEvents = [
      tabEvent(1, 100, {
        positions: [fretPosition(99, 1, 3), fretPosition(101, 4, 5)],
      }),
      tabEvent(2, 120),
      tabEvent(3, 140),
      tabEvent(4, 160),
    ];

    const result = build(
      [100, 120, 140, 160].map((x) => rhythmEvent(x)),
      tabEvents,
    );

    expect(result).toEqual([
      {
        measureNumber: 1,
        status: 'recognized',
        events: [
          expect.objectContaining({ tabEventOrder: 1, duration: 'quarter' }),
          expect.objectContaining({ tabEventOrder: 2, duration: 'quarter' }),
          expect.objectContaining({ tabEventOrder: 3, duration: 'quarter' }),
          expect.objectContaining({ tabEventOrder: 4, duration: 'quarter' }),
        ],
        warning: null,
      },
    ]);
    expect(tabEvents[0].positions).toHaveLength(2);
  });

  it('keeps an explicit rest in its measure without pairing it to a TAB column', () => {
    const result = build(
      [
        rhythmEvent(100),
        rhythmEvent(120),
        rhythmEvent(140),
        rhythmEvent(160, 'quarter', { isRest: true, sourceSymbols: ['rest-quarter'] }),
      ],
      [tabEvent(1, 100), tabEvent(2, 120), tabEvent(3, 140)],
    );

    expect(result[0]).toEqual(expect.objectContaining({ status: 'recognized', warning: null }));
    expect(result[0].events[3]).toEqual(expect.objectContaining({
      tabEventOrder: null,
      duration: 'quarter',
      isRest: true,
      sourceSymbols: ['rest-quarter'],
    }));
  });

  it('falls back when two TAB columns are equally near a non-rest event', () => {
    const result = build(
      [rhythmEvent(101, 'whole')],
      [tabEvent(1, 100), tabEvent(2, 102)],
    );

    expect(result).toEqual([
      expect.objectContaining({
        measureNumber: 1,
        status: 'fallback',
        events: [],
        warning: expect.stringContaining('unique TAB column'),
      }),
    ]);
  });

  it('falls back when pairing candidates inside the tolerance belong to different measures', () => {
    const result = build(
      [rhythmEvent(100, 'whole')],
      [
        tabEvent(1, 100),
        tabEvent(1, 101, { measureNumber: 2, positions: [{ ...fretPosition(101), measureNumber: 2 }] }),
      ],
      { measureNumbers: [1, 2] },
    );

    expect(result[0]).toEqual(expect.objectContaining({
      status: 'fallback',
      events: [],
      warning: expect.stringContaining('unique TAB column'),
    }));
  });

  it('does not guess a rest measure when one page contains multiple requested measures', () => {
    const result = build(
      [rhythmEvent(100, 'whole', { isRest: true })],
      [
        tabEvent(1, 100),
        tabEvent(1, 200, { measureNumber: 2, positions: [{ ...fretPosition(200), measureNumber: 2 }] }),
      ],
      { measureNumbers: [1, 2] },
    );

    expect(result.every((measure) => measure.status === 'fallback')).toBe(true);
    expect(result[0].warning).toContain('assigned safely');
  });

  it('falls back unless TAB columns and non-rest rhythm events have a one-to-one match', () => {
    const duplicatedColumn = build(
      [rhythmEvent(99, 'half'), rhythmEvent(101, 'half')],
      [tabEvent(1, 100)],
    );
    const unusedColumn = build(
      [rhythmEvent(100, 'whole')],
      [tabEvent(1, 100), tabEvent(2, 140)],
    );

    expect(duplicatedColumn[0]).toEqual(expect.objectContaining({
      status: 'fallback',
      events: [],
      warning: expect.stringContaining('one-to-one'),
    }));
    expect(unusedColumn[0]).toEqual(expect.objectContaining({
      status: 'fallback',
      events: [],
      warning: expect.stringContaining('one-to-one'),
    }));
  });

  it('falls back for medium-confidence rhythm or TAB events', () => {
    expect(build(
      [rhythmEvent(100, 'whole', { confidence: 'medium' })],
      [tabEvent(1, 100)],
    )[0]).toEqual(expect.objectContaining({
      status: 'fallback',
      warning: expect.stringContaining('high-confidence'),
    }));

    expect(build(
      [rhythmEvent(100, 'whole')],
      [tabEvent(1, 100, { confidence: 'medium' })],
    )[0]).toEqual(expect.objectContaining({
      status: 'fallback',
      warning: expect.stringContaining('high-confidence'),
    }));
  });

  it('returns one fallback result for every requested measure without rhythm events', () => {
    const result = build(
      [rhythmEvent(100, 'whole')],
      [
        tabEvent(1, 100),
        tabEvent(1, 200, { measureNumber: 2, positions: [{ ...fretPosition(200), measureNumber: 2 }] }),
      ],
      { measureNumbers: [1, 2] },
    );

    expect(result).toEqual([
      expect.objectContaining({ measureNumber: 1, status: 'recognized' }),
      expect.objectContaining({
        measureNumber: 2,
        status: 'fallback',
        events: [],
        warning: expect.stringContaining('no rhythm events'),
      }),
    ]);
  });

  it.each([
    ['exact', 4, 'recognized'],
    ['short', 3, 'fallback'],
    ['long', 5, 'fallback'],
  ] as const)('returns %s 4/4 totals as %s', (_label, eventCount, status) => {
    const xValues = Array.from({ length: eventCount }, (_, index) => 100 + index * 20);
    const result = build(
      xValues.map((x) => rhythmEvent(x)),
      xValues.map((x, index) => tabEvent(index + 1, x)),
    );

    expect(result[0].status).toBe(status);
    if (status === 'fallback') {
      expect(result[0].events).toEqual([]);
      expect(result[0].warning).toContain('capacity');
    }
  });

  it('counts one augmentation dot as half the base duration in integer units', () => {
    const result = build(
      [
        rhythmEvent(100, 'half', { dots: 1 }),
        rhythmEvent(140, 'quarter'),
      ],
      [tabEvent(1, 100), tabEvent(2, 140)],
    );

    expect(result[0]).toEqual(expect.objectContaining({ status: 'recognized', warning: null }));
  });

  it('validates another supported time signature with thirty-second-note units', () => {
    const xValues = [100, 120, 140, 160, 180, 200];
    const result = build(
      xValues.map((x) => rhythmEvent(x, 'eighth')),
      xValues.map((x, index) => tabEvent(index + 1, x)),
      { beats: 6, beatType: 8 },
    );

    expect(result[0]).toEqual(expect.objectContaining({ status: 'recognized', warning: null }));
  });

  it('falls back when the time signature cannot be represented in thirty-second-note units', () => {
    const result = build(
      [rhythmEvent(100, '16th')],
      [tabEvent(1, 100)],
      { beats: 3, beatType: 64 },
    );

    expect(result[0]).toEqual(expect.objectContaining({
      status: 'fallback',
      events: [],
      warning: expect.stringContaining('thirty-second-note capacity'),
    }));
  });
});
