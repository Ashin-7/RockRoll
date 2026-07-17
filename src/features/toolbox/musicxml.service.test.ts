import { describe, expect, it } from 'vitest';
import { createMusicXml, getMusicXmlFileName } from './musicxml.service';
import type {
  MeasureRhythmResult,
  RecognizedRhythmEvent,
  RhythmDuration,
  TabFretEvent,
  TabFretPosition,
  TabScoreAnalysis,
} from './toolbox.types';

const analysis: TabScoreAnalysis = {
  fileName: 'A & B.pdf',
  pageCount: 4,
  title: 'A & B <Demo>',
  tempo: 92,
  beats: 4,
  beatType: 4,
  measureNumbers: [1, 2, 3],
  vectorDrawingCount: 1703,
  tabStaffSystems: [],
  fretPositions: [],
  fretEvents: [],
  rhythmMeasures: [],
  warnings: ['Note recognition is not available yet; exported measures will contain rests.'],
};

function rhythmEvent(
  measureNumber: number,
  tabEventOrder: number | null,
  duration: RhythmDuration,
  overrides: Partial<RecognizedRhythmEvent> = {},
): RecognizedRhythmEvent {
  return {
    page: 1,
    measureNumber,
    tabEventOrder,
    duration,
    dots: 0,
    isRest: tabEventOrder === null,
    confidence: 'high',
    sourceSymbols: [`measure-${measureNumber}-event-${tabEventOrder ?? 'rest'}`],
    ...overrides,
  };
}

function fretPosition(
  measureNumber: number,
  order: number,
  stringNumber: TabFretPosition['stringNumber'] = 1,
  fret = 0,
): TabFretPosition {
  return {
    page: 1,
    measureNumber,
    stringNumber,
    fret,
    x: order * 20,
    y: stringNumber * 10,
    confidence: 'high',
  };
}

function fretEvent(
  measureNumber: number,
  order: number,
  positions: TabFretPosition[] = [fretPosition(measureNumber, order)],
): TabFretEvent {
  return {
    page: 1,
    measureNumber,
    order,
    x: order * 20,
    positions,
    confidence: 'high',
  };
}

function recognizedMeasure(
  measureNumber: number,
  events: RecognizedRhythmEvent[],
): MeasureRhythmResult {
  return {
    measureNumber,
    status: 'recognized',
    events,
    warning: null,
  };
}

describe('createMusicXml', () => {
  it('creates a valid standard-guitar score skeleton with measure rests and warnings', () => {
    const xml = createMusicXml(analysis);
    const document = new DOMParser().parseFromString(xml, 'application/xml');

    expect(document.querySelector('parsererror')).toBeNull();
    expect(xml).toContain('<work-title>A &amp; B &lt;Demo&gt;</work-title>');
    expect(xml).toContain('<sign>TAB</sign>');
    expect(xml).toContain('<line>5</line>');
    expect(xml).toContain('<staff-lines>6</staff-lines>');
    expect(xml).toContain('<tuning-step>E</tuning-step>');
    expect(xml).toContain('<tuning-step>A</tuning-step>');
    expect(xml).toContain('<tuning-step>D</tuning-step>');
    expect(xml).toContain('<tuning-step>G</tuning-step>');
    expect(xml).toContain('<tuning-step>B</tuning-step>');
    expect(xml).toContain('<per-minute>92</per-minute>');
    expect(xml).toContain('<beats>4</beats>');
    expect(xml).toContain('<beat-type>4</beat-type>');
    expect(document.querySelectorAll('part > measure')).toHaveLength(3);
    expect(document.querySelectorAll('note > rest')).toHaveLength(3);
    expect(xml).toContain('Note recognition is not available yet; exported measures will contain rests.');
  });

  it('serializes complete recognized measures with exact rhythm and TAB notation', () => {
    const rhythmMeasures: MeasureRhythmResult[] = [
      recognizedMeasure(1, [rhythmEvent(1, 1, 'whole')]),
      recognizedMeasure(2, [
        rhythmEvent(2, 1, 'half'),
        rhythmEvent(2, 2, 'half'),
      ]),
      recognizedMeasure(3, Array.from({ length: 4 }, (_, index) => (
        rhythmEvent(3, index + 1, 'quarter')
      ))),
      recognizedMeasure(4, Array.from({ length: 8 }, (_, index) => (
        rhythmEvent(4, index + 1, 'eighth')
      ))),
      recognizedMeasure(5, Array.from({ length: 16 }, (_, index) => (
        rhythmEvent(5, index + 1, '16th')
      ))),
      recognizedMeasure(6, [
        rhythmEvent(6, 1, 'half', { dots: 1 }),
        rhythmEvent(6, null, 'quarter'),
      ]),
    ];
    const fretEvents = rhythmMeasures.flatMap((measure) => (
      measure.events.flatMap((event) => {
        if (event.tabEventOrder === null) {
          return [];
        }

        const positions = measure.measureNumber === 1
          ? [
            fretPosition(1, event.tabEventOrder, 6, 0),
            fretPosition(1, event.tabEventOrder, 5, 2),
          ]
          : [fretPosition(measure.measureNumber, event.tabEventOrder, 1, 3)];
        return [fretEvent(measure.measureNumber, event.tabEventOrder, positions)];
      })
    ));
    const xml = createMusicXml({
      ...analysis,
      measureNumbers: [1, 2, 3, 4, 5, 6],
      rhythmMeasures,
      fretEvents,
      warnings: [],
    });
    const document = new DOMParser().parseFromString(xml, 'application/xml');

    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.querySelector('divisions')?.textContent).toBe('8');

    const chordNotes = document.querySelectorAll('measure[number="1"] > note');
    expect(chordNotes).toHaveLength(2);
    expect(chordNotes[0].querySelector('chord')).toBeNull();
    expect(chordNotes[1].querySelector('chord')).not.toBeNull();
    expect(chordNotes[0].querySelector('technical > string')?.textContent).toBe('6');
    expect(chordNotes[0].querySelector('technical > fret')?.textContent).toBe('0');
    expect(chordNotes[1].querySelector('technical > string')?.textContent).toBe('5');
    expect(chordNotes[1].querySelector('technical > fret')?.textContent).toBe('2');

    const expectedRhythms = [
      { measure: 1, durations: ['32', '32'], types: ['whole', 'whole'] },
      { measure: 2, durations: ['16', '16'], types: ['half', 'half'] },
      { measure: 3, durations: Array(4).fill('8'), types: Array(4).fill('quarter') },
      { measure: 4, durations: Array(8).fill('4'), types: Array(8).fill('eighth') },
      { measure: 5, durations: Array(16).fill('2'), types: Array(16).fill('16th') },
      { measure: 6, durations: ['24', '8'], types: ['half', 'quarter'] },
    ];
    expectedRhythms.forEach(({ measure, durations, types }) => {
      const notes = [...document.querySelectorAll(`measure[number="${measure}"] > note`)];
      expect(notes.map((note) => note.querySelector('duration')?.textContent)).toEqual(durations);
      expect(notes.map((note) => note.querySelector('type')?.textContent)).toEqual(types);
    });

    const dottedNote = document.querySelector('measure[number="6"] > note');
    expect(dottedNote?.querySelector('dot')).not.toBeNull();
    const explicitRest = document.querySelector('measure[number="6"] > note:nth-of-type(2)');
    expect(explicitRest?.querySelector('rest:not([measure])')).not.toBeNull();
  });

  it('falls back the entire measure when any referenced TAB event cannot be resolved', () => {
    const xml = createMusicXml({
      ...analysis,
      measureNumbers: [1, 2, 3],
      fretEvents: [fretEvent(1, 1)],
      rhythmMeasures: [
        recognizedMeasure(1, [rhythmEvent(1, 1, 'whole')]),
        {
          measureNumber: 2,
          status: 'fallback',
          events: [],
          warning: 'Measure 2 has no rhythm events.',
        },
        recognizedMeasure(3, [
          rhythmEvent(3, 1, 'half'),
          rhythmEvent(3, null, 'half'),
        ]),
      ],
    });
    const document = new DOMParser().parseFromString(xml, 'application/xml');

    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.querySelector('measure[number="1"] rest[measure="yes"]')).toBeNull();
    expect(document.querySelectorAll('measure[number="1"] technical')).toHaveLength(1);
    expect(document.querySelectorAll('measure[number="2"] > note')).toHaveLength(1);
    expect(document.querySelector('measure[number="2"] rest[measure="yes"]')).not.toBeNull();
    expect(document.querySelectorAll('measure[number="3"] > note')).toHaveLength(1);
    expect(document.querySelector('measure[number="3"] rest[measure="yes"]')).not.toBeNull();
    expect(document.querySelector('credit-words')?.textContent).toContain('Fallback measures: 2, 3.');
  });

  it('falls back instead of treating an unsupported dot count as an undotted event', () => {
    const positions = [fretPosition(1, 1), fretPosition(1, 2)];
    const invalidDotEvent = rhythmEvent(1, 1, 'half', {
      dots: 2 as RecognizedRhythmEvent['dots'],
    });
    const xml = createMusicXml({
      ...analysis,
      measureNumbers: [1],
      fretEvents: [
        fretEvent(1, 1, [positions[0]]),
        fretEvent(1, 2, [positions[1]]),
      ],
      rhythmMeasures: [recognizedMeasure(1, [
        invalidDotEvent,
        rhythmEvent(1, 2, 'half'),
      ])],
      warnings: [],
    });
    const document = new DOMParser().parseFromString(xml, 'application/xml');

    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.querySelectorAll('measure[number="1"] > note')).toHaveLength(1);
    expect(document.querySelector('measure[number="1"] rest[measure="yes"]')).not.toBeNull();
    expect(document.querySelector('measure[number="1"] technical')).toBeNull();
    expect(document.querySelector('credit-words')?.textContent).toContain('Fallback measures: 1.');
  });

  it('keeps capacity, duplicate-match, and low-confidence failures atomic at measure level', () => {
    const shortPosition = fretPosition(1, 1);
    const duplicatePosition = fretPosition(1, 1);
    const mediumPosition = { ...fretPosition(1, 1), confidence: 'medium' as const };
    const cases: TabScoreAnalysis[] = [
      {
        ...analysis,
        measureNumbers: [1],
        fretEvents: [fretEvent(1, 1, [shortPosition])],
        rhythmMeasures: [recognizedMeasure(1, [rhythmEvent(1, 1, 'half')])],
        warnings: [],
      },
      {
        ...analysis,
        measureNumbers: [1],
        fretEvents: [
          fretEvent(1, 1, [duplicatePosition]),
          fretEvent(1, 1, [duplicatePosition]),
        ],
        rhythmMeasures: [recognizedMeasure(1, [rhythmEvent(1, 1, 'whole')])],
        warnings: [],
      },
      {
        ...analysis,
        measureNumbers: [1],
        fretEvents: [fretEvent(1, 1, [mediumPosition])],
        rhythmMeasures: [recognizedMeasure(1, [rhythmEvent(1, 1, 'whole')])],
        warnings: [],
      },
    ];

    cases.forEach((invalidAnalysis) => {
      const document = new DOMParser().parseFromString(createMusicXml(invalidAnalysis), 'application/xml');
      expect(document.querySelector('parsererror')).toBeNull();
      expect(document.querySelectorAll('measure[number="1"] > note')).toHaveLength(1);
      expect(document.querySelector('measure[number="1"] rest[measure="yes"]')).not.toBeNull();
      expect(document.querySelector('measure[number="1"] technical')).toBeNull();
    });
  });
});

describe('getMusicXmlFileName', () => {
  it('replaces the PDF extension without changing the display name', () => {
    expect(getMusicXmlFileName('endless rain.PDF')).toBe('endless rain.musicxml');
  });
});
