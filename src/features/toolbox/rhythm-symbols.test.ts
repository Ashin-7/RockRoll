import { describe, expect, it } from 'vitest';
import { recognizeRhythmGlyphs } from './rhythm-symbols';
import type { PairedStaffSystem, PdfVectorPath } from './toolbox.types';

const PAGE = 1;
const NOTE_X1 = 50;
const NOTE_X2 = 60;
const NOTE_Y1 = 55;
const NOTE_Y2 = 63;

function pairedSystem(): PairedStaffSystem {
  return {
    page: PAGE,
    x1: 20,
    x2: 220,
    standardLineYs: [40, 50, 60, 70, 80],
    tabSystem: {
      page: PAGE,
      x1: 20,
      x2: 220,
      stringYs: [110, 120, 130, 140, 150, 160],
      averageStringGap: 10,
      confidence: 'high',
    },
    confidence: 'high',
  };
}

function closedPath(
  paint: PdfVectorPath['paint'],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): PdfVectorPath {
  return {
    page: PAGE,
    paint,
    bounds: { x1, y1, x2, y2 },
    commands: [
      { type: 'move', x: x1, y: y1 },
      { type: 'line', x: x2, y: y1 },
      { type: 'line', x: x2, y: y2 },
      { type: 'line', x: x1, y: y2 },
      { type: 'close' },
    ],
  };
}

function notehead(paint: PdfVectorPath['paint']): PdfVectorPath {
  return closedPath(paint, NOTE_X1, NOTE_Y1, NOTE_X2, NOTE_Y2);
}

function stem(x = NOTE_X2, y1 = 43, y2 = NOTE_Y1): PdfVectorPath {
  return {
    page: PAGE,
    paint: 'stroke',
    bounds: { x1: x, y1, x2: x, y2 },
    commands: [
      { type: 'move', x, y: y1 },
      { type: 'line', x, y: y2 },
    ],
  };
}

function beam(y1: number, x1 = NOTE_X2, x2 = 75, y2 = y1 + 2): PdfVectorPath {
  return closedPath('fill', x1, y1, x2, y2);
}

function recognize(paths: PdfVectorPath[]) {
  return recognizeRhythmGlyphs(paths, [pairedSystem()]);
}

function expectDuration(
  paths: PdfVectorPath[],
  duration: 'whole' | 'half' | 'quarter' | 'eighth' | '16th',
  sourceSymbols: string[],
): void {
  expect(recognize(paths).glyphs).toContainEqual(
    expect.objectContaining({
      duration,
      isRest: false,
      confidence: 'high',
      sourceSymbols,
    }),
  );
}

describe('recognizeRhythmGlyphs', () => {
  it('classifies an open notehead without a stem as a whole note', () => {
    expectDuration([notehead('stroke')], 'whole', ['open-notehead']);
  });

  it('classifies an open notehead with one attached stem as a half note', () => {
    expectDuration([notehead('stroke'), stem()], 'half', ['open-notehead', 'stem']);
  });

  it('classifies a filled notehead with a stem and no beam as a quarter note', () => {
    expectDuration([notehead('fill'), stem()], 'quarter', ['filled-notehead', 'stem']);
  });

  it('accepts a closed fill-stroke narrow rectangle as a filled stem', () => {
    const filledStem = closedPath('fill-stroke', 59, 43, 60, 55);

    expectDuration([notehead('fill'), filledStem], 'quarter', ['filled-notehead', 'stem']);
  });

  it('classifies a filled notehead with one attached beam as an eighth note', () => {
    expectDuration([notehead('fill'), stem(), beam(43)], 'eighth', [
      'filled-notehead',
      'stem',
      'beam-1',
    ]);
  });

  it('classifies a filled notehead with two attached beams as a sixteenth note', () => {
    expectDuration([notehead('fill'), stem(), beam(43), beam(47)], '16th', [
      'filled-notehead',
      'stem',
      'beam-1',
      'beam-2',
    ]);
  });

  it('rejects a filled notehead without a stem', () => {
    expect(recognize([notehead('fill')]).glyphs).toEqual([]);
  });

  it('rejects a beam that is not attached to the event stem', () => {
    const result = recognize([notehead('fill'), stem(), beam(43, 65, 80)]);

    expect(result.glyphs).toContainEqual(expect.objectContaining({ duration: 'quarter' }));
    expect(result.glyphs).not.toContainEqual(expect.objectContaining({ duration: 'eighth' }));
  });

  it('treats a fill-stroke notehead as open only when it contains a nested closed contour', () => {
    const openWithHole: PdfVectorPath = {
      ...notehead('fill-stroke'),
      commands: [
        ...notehead('fill-stroke').commands,
        { type: 'move', x: 53, y: 57 },
        { type: 'line', x: 57, y: 57 },
        { type: 'line', x: 57, y: 61 },
        { type: 'line', x: 53, y: 61 },
        { type: 'close' },
      ],
    };

    expectDuration([openWithHole], 'whole', ['open-notehead']);
    expect(recognize([notehead('fill-stroke')]).glyphs).toEqual([]);
  });

  it('accepts the exact compact-notehead, stem-tolerance, and beam-size boundaries', () => {
    const boundaryNote = closedPath('fill', 50, 55, 56, 59);
    const boundaryStem = stem(58, 45, 55);
    const boundaryBeam = beam(45, 58, 66, 46.2);

    expectDuration([boundaryNote, boundaryStem, boundaryBeam], 'eighth', [
      'filled-notehead',
      'stem',
      'beam-1',
    ]);
  });

  it('warns and emits no glyph when more than one stem is an equally valid match', () => {
    const result = recognize([notehead('fill'), stem(NOTE_X2), stem(NOTE_X1)]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('warns and emits no glyph for duplicate non-unique beam contours', () => {
    const duplicateBeam = beam(43);
    const result = recognize([notehead('fill'), stem(), duplicateBeam, { ...duplicateBeam }]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('only diagnoses a medium-confidence paired system', () => {
    const system = pairedSystem();
    system.confidence = 'medium';

    const result = recognizeRhythmGlyphs([notehead('stroke')], [system]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
