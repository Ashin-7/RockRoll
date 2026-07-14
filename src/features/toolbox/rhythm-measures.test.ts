import { describe, expect, it } from 'vitest';
import { buildMeasureRhythmResults } from './rhythm-measures';
import type {
  PairedStaffSystem,
  RhythmGlyphEvent,
  TabFretEvent,
  TabFretPosition,
} from './toolbox.types';

function pairedSystem(overrides: Partial<PairedStaffSystem> = {}): PairedStaffSystem {
  return {
    page: 1,
    x1: 20,
    x2: 220,
    standardLineYs: [40, 50, 60, 70, 80],
    tabSystem: {
      page: 1,
      x1: 20,
      x2: 220,
      stringYs: [110, 120, 130, 140, 150, 160],
      averageStringGap: 10,
      confidence: 'high',
    },
    confidence: 'high',
    ...overrides,
  };
}

function position(
  measureNumber: number,
  x: number,
  stringNumber: TabFretPosition['stringNumber'] = 1,
  y = 110,
): TabFretPosition {
  return {
    page: 1,
    measureNumber,
    stringNumber,
    fret: 3,
    x,
    y,
    confidence: 'high',
  };
}

function tabEvent(
  measureNumber: number,
  order: number,
  x: number,
  positions: TabFretPosition[] = [position(measureNumber, x)],
): TabFretEvent {
  return { page: 1, measureNumber, order, x, positions, confidence: 'high' };
}

function glyph(
  x: number,
  overrides: Partial<RhythmGlyphEvent> = {},
): RhythmGlyphEvent {
  return {
    page: 1,
    systemIndex: 0,
    x,
    duration: 'quarter',
    dots: 0,
    isRest: false,
    confidence: 'high',
    sourceSymbols: ['filled-notehead', 'stem'],
    ...overrides,
  };
}

function build(
  glyphs: RhythmGlyphEvent[],
  tabEvents: TabFretEvent[],
  overrides: Partial<Parameters<typeof buildMeasureRhythmResults>[0]> = {},
) {
  return buildMeasureRhythmResults({
    glyphs,
    tabEvents,
    pairedSystems: [pairedSystem()],
    measureNumbers: [3],
    beats: 4,
    beatType: 4,
    ...overrides,
  });
}

describe('buildMeasureRhythmResults', () => {
  it('pairs each high-confidence glyph with the unique nearest TAB column', () => {
    const tabEvents = [
      tabEvent(3, 1, 60),
      tabEvent(3, 2, 100),
      tabEvent(3, 3, 140),
      tabEvent(3, 4, 180),
    ];

    expect(build(tabEvents.map((event) => glyph(event.x + 1)), tabEvents)).toEqual([
      {
        measureNumber: 3,
        status: 'recognized',
        events: [1, 2, 3, 4].map((order) =>
          expect.objectContaining({
            measureNumber: 3,
            tabEventOrder: order,
            duration: 'quarter',
            isRest: false,
          }),
        ),
        warning: null,
      },
    ]);
  });

  it('maps one rhythm glyph to a TAB event containing multiple fret positions', () => {
    const chord = tabEvent(3, 1, 100, [position(3, 99, 1), position(3, 101, 4, 140)]);
    const result = build(
      [glyph(100, { duration: 'whole' })],
      [chord],
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        status: 'recognized',
        events: [expect.objectContaining({ tabEventOrder: 1, duration: 'whole' })],
      }),
    );
  });

  it('assigns an explicit rest only when successful neighbors in the same system share a measure', () => {
    const tabEvents = [tabEvent(3, 1, 60), tabEvent(3, 2, 180)];
    const result = build(
      [
        glyph(60, { duration: 'quarter' }),
        glyph(100, { duration: 'half', isRest: true, sourceSymbols: ['half-rest'] }),
        glyph(180, { duration: 'quarter' }),
      ],
      tabEvents,
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        status: 'recognized',
        events: expect.arrayContaining([
          expect.objectContaining({ tabEventOrder: null, duration: 'half', isRest: true }),
        ]),
      }),
    );
  });

  it('falls back instead of assigning a rest between different measures', () => {
    const result = build(
      [
        glyph(80, { duration: 'half' }),
        glyph(120, { duration: 'quarter', isRest: true, sourceSymbols: ['quarter-rest'] }),
        glyph(160, { duration: 'half' }),
      ],
      [tabEvent(3, 1, 80), tabEvent(4, 1, 160)],
      { measureNumbers: [3, 4] },
    );

    expect(result).toEqual([
      expect.objectContaining({ measureNumber: 3, status: 'fallback', warning: expect.any(String) }),
      expect.objectContaining({ measureNumber: 4, status: 'fallback', warning: expect.any(String) }),
    ]);
    expect(result.flatMap((measure) => measure.events)).not.toContainEqual(
      expect.objectContaining({ isRest: true }),
    );
  });

  it('does not recognize a pure-rest measure without non-rest anchors', () => {
    const result = build(
      [glyph(100, { duration: 'whole', isRest: true, sourceSymbols: ['whole-rest'] })],
      [],
    );

    expect(result[0]).toEqual(
      expect.objectContaining({ status: 'fallback', events: [], warning: expect.any(String) }),
    );
  });

  it('falls back when the nearest TAB column is ambiguous', () => {
    const result = build(
      [glyph(100, { duration: 'whole' })],
      [tabEvent(3, 1, 90), tabEvent(3, 2, 110)],
    );

    expect(result[0]).toEqual(
      expect.objectContaining({ status: 'fallback', warning: expect.any(String) }),
    );
  });

  it('falls back when a glyph exceeds the single-column system tolerance', () => {
    const result = build(
      [glyph(106, { duration: 'whole' })],
      [tabEvent(3, 1, 100)],
    );

    expect(result[0]).toEqual(
      expect.objectContaining({ status: 'fallback', warning: expect.any(String) }),
    );
  });

  it('does not pair TAB events from another staff system on the same page', () => {
    const secondSystem = pairedSystem({
      x1: 250,
      x2: 450,
      tabSystem: {
        page: 1,
        x1: 250,
        x2: 450,
        stringYs: [310, 320, 330, 340, 350, 360],
        averageStringGap: 10,
        confidence: 'high',
      },
    });
    const wrongBandEvent = tabEvent(3, 1, 100, [position(3, 100, 1, 310)]);

    const result = build(
      [glyph(100, { duration: 'whole' })],
      [wrongBandEvent],
      { pairedSystems: [pairedSystem(), secondSystem] },
    );

    expect(result[0]).toEqual(
      expect.objectContaining({ status: 'fallback', warning: expect.any(String) }),
    );
  });

  it('falls back when any glyph is medium confidence', () => {
    const result = build(
      [glyph(100, { duration: 'whole', confidence: 'medium' })],
      [tabEvent(3, 1, 100)],
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        status: 'fallback',
        events: [expect.objectContaining({ confidence: 'medium' })],
        warning: expect.any(String),
      }),
    );
  });

  it('falls back when a TAB event has no rhythm glyph', () => {
    const result = build(
      [glyph(80, { duration: 'whole' })],
      [tabEvent(3, 1, 80), tabEvent(3, 2, 160)],
    );

    expect(result[0]).toEqual(
      expect.objectContaining({ status: 'fallback', warning: expect.any(String) }),
    );
  });

  it.each([
    ['exact', ['quarter', 'quarter', 'quarter', 'quarter'], 'recognized'],
    ['short', ['quarter', 'quarter', 'quarter'], 'fallback'],
    ['long', ['half', 'half', 'quarter'], 'fallback'],
  ] as const)('%s 4/4 duration total produces %s', (_name, durations, status) => {
    const tabEvents = durations.map((_duration, index) => tabEvent(3, index + 1, 50 + index * 40));
    const glyphs = durations.map((duration, index) => glyph(50 + index * 40, { duration }));

    expect(build(glyphs, tabEvents)[0]).toEqual(expect.objectContaining({ status }));
  });

  it('uses exact thirty-second units for a dotted duration', () => {
    const result = build(
      [
        glyph(60, { duration: 'half', dots: 1 }),
        glyph(120, { duration: 'quarter' }),
      ],
      [tabEvent(3, 1, 60), tabEvent(3, 2, 120)],
    );

    expect(result[0]).toEqual(expect.objectContaining({ status: 'recognized' }));
  });

  it('falls back when the time signature capacity is not an integer thirty-second unit', () => {
    const result = build(
      [glyph(100, { duration: 'whole' })],
      [tabEvent(3, 1, 100)],
      { beats: 1, beatType: 64 },
    );

    expect(result[0]).toEqual(
      expect.objectContaining({ status: 'fallback', warning: expect.any(String) }),
    );
  });
});
