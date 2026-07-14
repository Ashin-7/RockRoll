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

function shapedPath(
  bounds: PdfVectorPath['bounds'],
  commandTypes: Array<'move' | 'line' | 'curve' | 'close'>,
): PdfVectorPath {
  const { x1, y1, x2, y2 } = bounds;
  const commands = commandTypes.map((type, index): PdfVectorPath['commands'][number] => {
    if (type === 'close') {
      return { type };
    }
    const x = index % 2 === 0 ? x1 : x2;
    const y = y1 + ((y2 - y1) * index) / (commandTypes.length - 1);
    if (type === 'curve') {
      return { type, x1, y1: y, x2, y2: y, x, y };
    }
    return { type, x, y };
  });

  return { page: PAGE, paint: 'fill', bounds, commands };
}

function wholeRest(x1 = 80, x2 = 90, height = 3.5): PdfVectorPath {
  return closedPath('fill', x1, 50, x2, 50 + height);
}

function halfRest(x1 = 100, x2 = 110, height = 3.5): PdfVectorPath {
  return closedPath('fill', x1, 60 - height, x2, 60);
}

function quarterRest(bounds = { x1: 120, y1: 45, x2: 128, y2: 75 }): PdfVectorPath {
  return shapedPath(bounds, ['move', 'curve', 'line', 'curve', 'line', 'curve', 'close']);
}

function eighthRest(bounds = { x1: 140, y1: 47.5, x2: 150, y2: 72.5 }): PdfVectorPath {
  return shapedPath(bounds, ['move', 'line', 'curve', 'curve', 'line', 'close']);
}

function sixteenthRest(bounds = { x1: 160, y1: 42.5, x2: 170, y2: 77.5 }): PdfVectorPath {
  return shapedPath(bounds, [
    'move',
    'line',
    'curve',
    'curve',
    'line',
    'curve',
    'curve',
    'line',
    'close',
  ]);
}

function dot(x1: number, y1: number, size = 2): PdfVectorPath {
  return rectangularDot(x1, y1, size, size);
}

function rectangularDot(x1: number, y1: number, width: number, height: number): PdfVectorPath {
  return closedPath('fill', x1, y1, x1 + width, y1 + height);
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

  it.each([
    ['whole', wholeRest(), ['whole-rest']],
    ['half', halfRest(), ['half-rest']],
    ['quarter', quarterRest(), ['quarter-rest']],
    ['eighth', eighthRest(), ['eighth-rest']],
    ['16th', sixteenthRest(), ['16th-rest']],
  ] as const)('classifies an explicit %s rest topology', (duration, rest, sourceSymbols) => {
    expect(recognize([rest]).glyphs).toContainEqual(
      expect.objectContaining({
        duration,
        dots: 0,
        isRest: true,
        confidence: 'high',
        sourceSymbols,
      }),
    );
  });

  it('attaches exactly one small filled dot immediately right of a note', () => {
    expect(recognize([notehead('fill'), stem(), dot(62, 57)]).glyphs).toContainEqual(
      expect.objectContaining({
        duration: 'quarter',
        dots: 1,
        isRest: false,
        confidence: 'high',
        sourceSymbols: ['filled-notehead', 'stem', 'dot'],
      }),
    );
  });

  it('attaches exactly one small filled dot immediately right of a rest', () => {
    expect(recognize([quarterRest(), dot(130, 58)]).glyphs).toContainEqual(
      expect.objectContaining({
        duration: 'quarter',
        dots: 1,
        isRest: true,
        confidence: 'high',
        sourceSymbols: ['quarter-rest', 'dot'],
      }),
    );
  });

  it('downgrades an event and warns instead of choosing between two matching dots', () => {
    const result = recognize([quarterRest(), dot(130, 57), dot(130, 61)]);

    expect(result.glyphs).toContainEqual(
      expect.objectContaining({
        duration: 'quarter',
        dots: 0,
        isRest: true,
        confidence: 'medium',
        sourceSymbols: ['quarter-rest'],
      }),
    );
    expect(result.warnings).toContainEqual(expect.stringContaining('两个附点'));
  });

  it('diagnoses an isolated dot without producing a glyph', () => {
    const result = recognize([dot(130, 58)]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).toContainEqual(expect.stringContaining('孤立附点'));
  });

  it('accepts the exact rest and dot normalized boundaries', () => {
    const result = recognize([
      wholeRest(80, 88, 2.5),
      halfRest(100, 114, 5),
      quarterRest({ x1: 120, y1: 50, x2: 125, y2: 70 }),
      eighthRest({ x1: 140, y1: 52.5, x2: 147, y2: 67.5 }),
      sixteenthRest({ x1: 160, y1: 40, x2: 174, y2: 80 }),
      dot(89.5, 51.75, 1.5),
    ]);

    expect(result.glyphs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ duration: 'whole', dots: 1, isRest: true }),
        expect.objectContaining({ duration: 'half', dots: 0, isRest: true }),
        expect.objectContaining({ duration: 'quarter', dots: 0, isRest: true }),
        expect.objectContaining({ duration: 'eighth', dots: 0, isRest: true }),
        expect.objectContaining({ duration: '16th', dots: 0, isRest: true }),
      ]),
    );
  });

  it.each([
    ['whole minimum', 'whole', closedPath('fill', 80, 51, 88, 53.5)],
    ['whole maximum', 'whole', closedPath('fill', 80, 49, 94, 54)],
    ['half minimum', 'half', closedPath('fill', 100, 56.5, 108, 59)],
    ['half maximum', 'half', closedPath('fill', 100, 56, 114, 61)],
    ['quarter minimum', 'quarter', quarterRest({ x1: 120, y1: 55, x2: 125, y2: 75 })],
    ['quarter maximum', 'quarter', quarterRest({ x1: 120, y1: 37.5, x2: 130, y2: 72.5 })],
    ['eighth minimum', 'eighth', eighthRest({ x1: 140, y1: 60, x2: 147, y2: 75 })],
    ['eighth maximum', 'eighth', eighthRest({ x1: 140, y1: 37.5, x2: 154, y2: 67.5 })],
    ['16th minimum', '16th', sixteenthRest({ x1: 160, y1: 55, x2: 167, y2: 80 })],
    ['16th maximum', '16th', sixteenthRest({ x1: 160, y1: 32.5, x2: 174, y2: 72.5 })],
  ] as const)('accepts the %s normalized boundary', (_name, duration, rest) => {
    expect(recognize([rest]).glyphs).toContainEqual(
      expect.objectContaining({ duration, isRest: true, confidence: 'high' }),
    );
  });

  it.each([
    ['minimum size, minimum horizontal gap, and upper vertical tolerance', dot(61.5, 39.75, 1.5)],
    ['maximum size, maximum horizontal gap, and lower vertical tolerance', dot(65, 63.75, 3.5)],
    ['minimum aspect ratio', rectangularDot(62, 57, 2.625, 3.5)],
    ['maximum aspect ratio', rectangularDot(62, 57, 3.5, 3.5 / 1.33)],
  ])('accepts a dot at the exact %s boundary', (_name, boundaryDot) => {
    expect(recognize([notehead('fill'), stem(), boundaryDot]).glyphs).toContainEqual(
      expect.objectContaining({ duration: 'quarter', dots: 1, confidence: 'high' }),
    );
  });

  it('rejects rest topology, line attachment, and dot geometry outside the exact rules', () => {
    const wrongQuarterTopology = shapedPath(
      { x1: 120, y1: 45, x2: 128, y2: 75 },
      ['move', 'curve', 'line', 'curve', 'line', 'line', 'close'],
    );
    const detachedWholeRest = closedPath('fill', 80, 51.1, 90, 54.6);
    const oversizedDot = dot(130, 58, 3.6);
    const result = recognize([wrongQuarterTopology, detachedWholeRest, oversizedDot]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).not.toEqual([]);
  });

  it('does not treat curved or five-corner closed contours as beams', () => {
    const curvedBeam: PdfVectorPath = {
      ...beam(43),
      commands: [
        { type: 'move', x: 60, y: 43 },
        { type: 'curve', x1: 65, y1: 42, x2: 70, y2: 44, x: 75, y: 43 },
        { type: 'line', x: 75, y: 45 },
        { type: 'line', x: 60, y: 45 },
        { type: 'close' },
      ],
    };
    const fiveCornerBeam: PdfVectorPath = {
      ...beam(43),
      commands: [
        { type: 'move', x: 60, y: 43 },
        { type: 'line', x: 68, y: 43 },
        { type: 'line', x: 75, y: 44 },
        { type: 'line', x: 68, y: 45 },
        { type: 'line', x: 60, y: 45 },
        { type: 'close' },
      ],
    };

    expectDuration([notehead('fill'), stem(), curvedBeam], 'quarter', [
      'filled-notehead',
      'stem',
    ]);
    expectDuration([notehead('fill'), stem(), fiveCornerBeam], 'quarter', [
      'filled-notehead',
      'stem',
    ]);
  });

  it('warns and excludes a path that matches both notehead and beam rules', () => {
    const ambiguousShape = closedPath('fill', 60, 43, 70, 47);
    const result = recognize([notehead('fill'), stem(), ambiguousShape]);

    expect(result.glyphs).toEqual([
      expect.objectContaining({ duration: 'quarter', x: (NOTE_X1 + NOTE_X2) / 2 }),
    ]);
    expect(result.warnings).toEqual([
      expect.stringContaining('同时符合符头与符梁规则'),
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

  it('warns and emits no glyph for slightly offset overlapping beam contours', () => {
    const result = recognize([notehead('fill'), stem(), beam(43), beam(43.5)]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).toEqual([expect.stringContaining('符梁层级不唯一')]);
  });

  it('warns and emits no glyph for nested beam contours', () => {
    const outerBeam = beam(42.5, 59, 77, 45.5);
    const innerBeam = beam(43, 60, 75, 45);
    const result = recognize([notehead('fill'), stem(), outerBeam, innerBeam]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).toEqual([expect.stringContaining('符梁层级不唯一')]);
  });

  it('warns when separate beam regions have non-unique vertical centers', () => {
    const leftBeam = beam(43, 50, 58, 45);
    const rightBeam = beam(44, 62, 70, 46);
    const result = recognize([notehead('fill'), stem(), leftBeam, rightBeam]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).toEqual([expect.stringContaining('符梁层级不唯一')]);
  });

  it('only diagnoses a medium-confidence paired system', () => {
    const system = pairedSystem();
    system.confidence = 'medium';

    const result = recognizeRhythmGlyphs([notehead('stroke')], [system]);

    expect(result.glyphs).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
