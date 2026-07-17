import { describe, expect, it } from 'vitest';
import type { NotationPrimitive } from './notation-primitives';
import { recognizeRhythmTopology } from './rhythm-topology';
import type { PairedStaffSystem, PdfBounds } from './toolbox.types';

type ContourPrimitive = Extract<NotationPrimitive, { kind: 'contour' }>;
type SegmentPrimitive = Extract<NotationPrimitive, { kind: 'segment' }>;
type GlyphPrimitive = Extract<NotationPrimitive, { kind: 'glyph' }>;
type UnknownGlyphPrimitive = Extract<NotationPrimitive, { kind: 'unknown-glyph' }>;

function pairedSystem(): PairedStaffSystem {
  return {
    page: 1,
    x1: 0,
    x2: 200,
    standardLineYs: [40, 50, 60, 70, 80],
    averageStaffGap: 10,
    tabSystem: {
      page: 1,
      x1: 0,
      x2: 200,
      stringYs: [120, 130, 140, 150, 160, 170],
      averageStringGap: 10,
      confidence: 'high',
    },
    confidence: 'high',
  };
}

function contour(
  id: string,
  bounds: PdfBounds,
  overrides: Partial<ContourPrimitive> = {},
): ContourPrimitive {
  return {
    id,
    kind: 'contour',
    page: 1,
    systemIndex: 0,
    bounds,
    closed: true,
    hasHole: false,
    filled: true,
    quality: 'reliable',
    sourceIds: [id],
    ...overrides,
  };
}

function segment(
  id: string,
  bounds: PdfBounds,
  overrides: Partial<SegmentPrimitive> = {},
): SegmentPrimitive {
  return {
    id,
    kind: 'segment',
    page: 1,
    systemIndex: 0,
    bounds,
    quality: 'reliable',
    sourceIds: [id],
    ...overrides,
  };
}

function glyph(
  id: string,
  semantic: GlyphPrimitive['semantic'],
  bounds: PdfBounds,
): GlyphPrimitive {
  return {
    id,
    kind: 'glyph',
    page: 1,
    systemIndex: 0,
    bounds,
    semantic,
    quality: 'reliable',
    sourceIds: [id],
  };
}

function unknownGlyph(id: string, bounds: PdfBounds): UnknownGlyphPrimitive {
  return {
    id,
    kind: 'unknown-glyph',
    page: 1,
    systemIndex: 0,
    bounds,
    quality: 'uncertain',
    sourceIds: [id],
  };
}

describe('recognizeRhythmTopology', () => {
  it('recognizes path-only whole, half, and quarter notes from explicit head/stem relations', () => {
    const result = recognizeRhythmTopology([
      contour('whole-head', { x1: 10, y1: 54, x2: 24, y2: 64 }, { hasHole: true }),
      contour('half-outer', { x1: 40, y1: 54, x2: 54, y2: 64 }),
      contour('half-inner', { x1: 44, y1: 57, x2: 50, y2: 61 }, { filled: false }),
      segment('half-stem', { x1: 54, y1: 30, x2: 54, y2: 59 }),
      contour('quarter-head', { x1: 76, y1: 54, x2: 90, y2: 64 }),
      segment('quarter-stem', { x1: 90, y1: 30, x2: 90, y2: 59 }),
    ], [pairedSystem()]);

    expect(result.events.map((event) => event.duration)).toEqual(['whole', 'half', 'quarter']);
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        duration: 'whole',
        confidence: 'high',
        sourceSymbols: expect.arrayContaining(['open-notehead']),
      }),
      expect.objectContaining({
        duration: 'half',
        sourceSymbols: expect.arrayContaining(['open-notehead', 'stem']),
      }),
      expect.objectContaining({
        duration: 'quarter',
        sourceSymbols: expect.arrayContaining(['filled-notehead', 'stem']),
      }),
    ]));
  });

  it('recognizes a stroked closed outline as an open head only when a stem is incident', () => {
    const result = recognizeRhythmTopology([
      contour(
        'outlined-head',
        { x1: 30, y1: 54, x2: 44, y2: 64 },
        { filled: false },
      ),
      segment('stem', { x1: 44, y1: 30, x2: 44, y2: 59 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({ duration: 'half', confidence: 'high' }),
    ]);
  });

  it('recognizes glyph-only whole, half, and quarter notes from reliable semantics', () => {
    const result = recognizeRhythmTopology([
      glyph('whole-glyph', 'note-whole', { x1: 10, y1: 50, x2: 20, y2: 65 }),
      glyph('half-glyph', 'note-half', { x1: 40, y1: 35, x2: 50, y2: 65 }),
      glyph('quarter-glyph', 'note-quarter', { x1: 70, y1: 35, x2: 80, y2: 65 }),
    ], [pairedSystem()]);

    expect(result.events.map((event) => event.duration)).toEqual(['whole', 'half', 'quarter']);
    expect(result.events.every((event) => event.confidence === 'high')).toBe(true);
  });

  it('groups multiple noteheads sharing one stem into one rhythm event', () => {
    const result = recognizeRhythmTopology([
      contour('lower-head', { x1: 30, y1: 64, x2: 44, y2: 74 }),
      contour('upper-head', { x1: 30, y1: 48, x2: 44, y2: 58 }),
      segment('shared-stem', { x1: 44, y1: 28, x2: 44, y2: 69 }),
    ], [pairedSystem()]);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual(expect.objectContaining({
      duration: 'quarter',
      sourceSymbols: expect.arrayContaining(['filled-notehead', 'stem']),
    }));
  });

  it('does not infer a duration from a filled head and a detached stem', () => {
    const result = recognizeRhythmTopology([
      contour('detached-head', { x1: 30, y1: 54, x2: 44, y2: 64 }),
      segment('detached-stem', { x1: 50, y1: 30, x2: 50, y2: 59 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([]);
    expect(result.warnings).toContain('Ignored filled notehead detached-head because it has no unique incident stem.');
  });

  it('counts one and two reliable flag layers only when they are incident to the stem end', () => {
    const result = recognizeRhythmTopology([
      contour('eighth-head', { x1: 20, y1: 60, x2: 34, y2: 70 }),
      segment('eighth-stem', { x1: 34, y1: 30, x2: 34, y2: 65 }),
      glyph('eighth-flag', 'flag-eighth', { x1: 34, y1: 28, x2: 43, y2: 42 }),
      contour('sixteenth-head', { x1: 70, y1: 60, x2: 84, y2: 70 }),
      segment('sixteenth-stem', { x1: 84, y1: 30, x2: 84, y2: 65 }),
      glyph('sixteenth-flag', 'flag-16th', { x1: 84, y1: 28, x2: 95, y2: 48 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({
        duration: 'eighth',
        sourceSymbols: expect.arrayContaining(['filled-notehead', 'stem', 'flag-1']),
      }),
      expect.objectContaining({
        duration: '16th',
        sourceSymbols: expect.arrayContaining(['filled-notehead', 'stem', 'flag-1', 'flag-2']),
      }),
    ]);
  });

  it('recognizes one and two path flag contours from their incident stem-end relations', () => {
    const result = recognizeRhythmTopology([
      contour('eighth-head', { x1: 20, y1: 60, x2: 34, y2: 70 }),
      segment('eighth-stem', { x1: 34, y1: 30, x2: 34, y2: 65 }),
      contour('path-flag-1', { x1: 34, y1: 28, x2: 40, y2: 40 }),
      contour('sixteenth-head', { x1: 70, y1: 60, x2: 84, y2: 70 }),
      segment('sixteenth-stem', { x1: 84, y1: 30, x2: 84, y2: 65 }),
      contour('path-flag-2a', { x1: 84, y1: 28, x2: 90, y2: 36 }),
      contour('path-flag-2b', { x1: 84, y1: 38, x2: 90, y2: 46 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({
        duration: 'eighth',
        sourceSymbols: expect.arrayContaining(['flag-1']),
      }),
      expect.objectContaining({
        duration: '16th',
        sourceSymbols: expect.arrayContaining(['flag-1', 'flag-2']),
      }),
    ]);
  });

  it('recognizes one shared sloped beam from its incident relation to each stem', () => {
    const result = recognizeRhythmTopology([
      contour('left-head', { x1: 20, y1: 60, x2: 34, y2: 70 }),
      segment('left-stem', { x1: 34, y1: 28, x2: 34, y2: 65 }),
      contour('right-head', { x1: 80, y1: 60, x2: 94, y2: 70 }),
      segment('right-stem', { x1: 80, y1: 36, x2: 80, y2: 65 }),
      contour('sloped-beam', { x1: 33, y1: 27, x2: 81, y2: 38 }),
    ], [pairedSystem()]);

    expect(result.events).toHaveLength(2);
    result.events.forEach((event) => {
      expect(event).toEqual(expect.objectContaining({
        duration: 'eighth',
        sourceSymbols: expect.arrayContaining(['beam-1']),
      }));
    });
  });

  it('counts a partial secondary beam only for stems it actually touches', () => {
    const result = recognizeRhythmTopology([
      contour('head-1', { x1: 20, y1: 60, x2: 34, y2: 70 }),
      segment('stem-1', { x1: 34, y1: 28, x2: 34, y2: 65 }),
      contour('head-2', { x1: 70, y1: 60, x2: 84, y2: 70 }),
      segment('stem-2', { x1: 70, y1: 28, x2: 70, y2: 65 }),
      contour('head-3', { x1: 120, y1: 60, x2: 134, y2: 70 }),
      segment('stem-3', { x1: 120, y1: 28, x2: 120, y2: 65 }),
      contour('primary-beam', { x1: 33, y1: 27, x2: 121, y2: 31 }),
      contour('partial-secondary-beam', { x1: 33, y1: 36, x2: 71, y2: 40 }),
    ], [pairedSystem()]);

    expect(result.events.map((event) => event.duration)).toEqual(['16th', '16th', 'eighth']);
    expect(result.events[0].sourceSymbols).toEqual(expect.arrayContaining(['beam-1', 'beam-2']));
    expect(result.events[1].sourceSymbols).toEqual(expect.arrayContaining(['beam-1', 'beam-2']));
    expect(result.events[2].sourceSymbols).toEqual(expect.arrayContaining(['beam-1']));
  });

  it('does not count a nearby beam that has no touching or intersecting relation to the stem', () => {
    const result = recognizeRhythmTopology([
      contour('head', { x1: 20, y1: 60, x2: 34, y2: 70 }),
      segment('stem', { x1: 34, y1: 30, x2: 34, y2: 65 }),
      contour('unrelated-beam', { x1: 37, y1: 28, x2: 80, y2: 32 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({ duration: 'quarter' }),
    ]);
  });

  it('fuses agreeing path and reliable glyph evidence into one event with all sources', () => {
    const result = recognizeRhythmTopology([
      contour('path-head', { x1: 30, y1: 54, x2: 44, y2: 64 }),
      segment('path-stem', { x1: 44, y1: 30, x2: 44, y2: 59 }),
      glyph('quarter-glyph', 'note-quarter', { x1: 29, y1: 30, x2: 45, y2: 65 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({
        duration: 'quarter',
        confidence: 'high',
        sourceSymbols: expect.arrayContaining([
          'filled-notehead',
          'stem',
          'note-quarter',
          'path-head',
          'path-stem',
          'quarter-glyph',
        ]),
      }),
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('rejects a local event when strong path and reliable glyph durations conflict', () => {
    const result = recognizeRhythmTopology([
      contour('path-head', { x1: 30, y1: 54, x2: 44, y2: 64 }),
      segment('path-stem', { x1: 44, y1: 30, x2: 44, y2: 59 }),
      glyph('half-glyph', 'note-half', { x1: 29, y1: 30, x2: 45, y2: 65 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([]);
    expect(result.warnings).toContain(
      'Ignored local rhythm event near x=37 because strong topology and glyph semantics conflict.',
    );
  });

  it('keeps a strong note duration independent from nearby unknown glyph evidence', () => {
    const result = recognizeRhythmTopology([
      contour('head', { x1: 30, y1: 54, x2: 44, y2: 64 }),
      segment('stem', { x1: 44, y1: 30, x2: 44, y2: 59 }),
      unknownGlyph('unknown-near-note', { x1: 45, y1: 52, x2: 50, y2: 62 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({ duration: 'quarter', confidence: 'high' }),
    ]);
    expect(result.warnings).toContain(
      'Ignored unknown glyph unknown-near-note because it cannot determine rhythm duration.',
    );
  });

  it('recognizes reliable whole-through-sixteenth rest glyphs', () => {
    const result = recognizeRhythmTopology([
      glyph('whole-rest', 'rest-whole', { x1: 10, y1: 52, x2: 22, y2: 58 }),
      glyph('half-rest', 'rest-half', { x1: 40, y1: 52, x2: 52, y2: 58 }),
      glyph('quarter-rest', 'rest-quarter', { x1: 70, y1: 44, x2: 78, y2: 70 }),
      glyph('eighth-rest', 'rest-eighth', { x1: 100, y1: 44, x2: 110, y2: 70 }),
      glyph('sixteenth-rest', 'rest-16th', { x1: 130, y1: 40, x2: 142, y2: 72 }),
    ], [pairedSystem()]);

    expect(result.events.map((event) => ({
      duration: event.duration,
      isRest: event.isRest,
      dots: event.dots,
    }))).toEqual([
      { duration: 'whole', isRest: true, dots: 0 },
      { duration: 'half', isRest: true, dots: 0 },
      { duration: 'quarter', isRest: true, dots: 0 },
      { duration: 'eighth', isRest: true, dots: 0 },
      { duration: '16th', isRest: true, dots: 0 },
    ]);
    expect(result.events[0].sourceSymbols).toEqual(expect.arrayContaining(['rest-whole', 'whole-rest']));
  });

  it('does not promote a bounding-box-only path rest shape to strong evidence', () => {
    const result = recognizeRhythmTopology([
      contour('rest-sized-decoration', { x1: 30, y1: 45, x2: 36.5, y2: 70 }),
      contour('approximate-rest-shape', { x1: 70, y1: 45, x2: 79, y2: 68 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      'Ignored path primitive rest-sized-decoration because it does not match a reliable rhythm topology.',
      'Ignored path primitive approximate-rest-shape because it does not match a reliable rhythm topology.',
    ]));
  });

  it('attaches one augmentation dot only through a unique local right-side relation', () => {
    const result = recognizeRhythmTopology([
      contour('head', { x1: 30, y1: 54, x2: 44, y2: 64 }),
      segment('stem', { x1: 44, y1: 30, x2: 44, y2: 59 }),
      glyph('unique-dot', 'augmentation-dot', { x1: 48, y1: 57, x2: 51, y2: 60 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({
        duration: 'quarter',
        dots: 1,
        confidence: 'high',
        sourceSymbols: expect.arrayContaining(['augmentation-dot', 'unique-dot']),
      }),
    ]);
  });

  it('keeps a two-dot local attachment ambiguous and non-exportable', () => {
    const result = recognizeRhythmTopology([
      contour('head', { x1: 30, y1: 54, x2: 44, y2: 64 }),
      segment('stem', { x1: 44, y1: 30, x2: 44, y2: 59 }),
      glyph('dot-a', 'augmentation-dot', { x1: 48, y1: 57, x2: 51, y2: 60 }),
      glyph('dot-b', 'augmentation-dot', { x1: 54, y1: 57, x2: 57, y2: 60 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({ duration: 'quarter', dots: 0, confidence: 'medium' }),
    ]);
    expect(result.warnings).toContain(
      'Kept local rhythm event near x=37 as medium confidence because its augmentation dot is not unique.',
    );
  });

  it('keeps a vertically displaced right-side dot ambiguous with staccato', () => {
    const result = recognizeRhythmTopology([
      contour('head', { x1: 30, y1: 54, x2: 44, y2: 64 }),
      segment('stem', { x1: 44, y1: 30, x2: 44, y2: 59 }),
      glyph('staccato-ambiguous-dot', 'augmentation-dot', { x1: 48, y1: 43, x2: 51, y2: 46 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({ duration: 'quarter', dots: 0, confidence: 'medium' }),
    ]);
    expect(result.warnings).toContain(
      'Kept local rhythm event near x=37 as medium confidence because its dot is vertically ambiguous with staccato.',
    );
  });

  it('does not use a complete note glyph bounds as a high-confidence dot anchor', () => {
    const result = recognizeRhythmTopology([
      glyph('quarter-note', 'note-quarter', { x1: 30, y1: 30, x2: 44, y2: 65 }),
      glyph('stem-height-dot', 'augmentation-dot', { x1: 48, y1: 32, x2: 51, y2: 35 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([
      expect.objectContaining({ duration: 'quarter', dots: 0, confidence: 'medium' }),
    ]);
    expect(result.warnings).toContain(
      'Kept local rhythm event near x=37 as medium confidence because its glyph has no reliable dot anchor.',
    );
  });

  it('reports unsupported tuplet, tie, and grace evidence without deriving duration from it', () => {
    const result = recognizeRhythmTopology([
      unknownGlyph('tuplet-marker', { x1: 20, y1: 34, x2: 25, y2: 40 }),
      contour(
        'tie-like-curve',
        { x1: 50, y1: 54, x2: 80, y2: 58 },
        { filled: false },
      ),
      glyph('grace-sized-note', 'note-eighth', { x1: 100, y1: 55, x2: 104, y2: 59 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      'Ignored unknown glyph tuplet-marker because it cannot determine rhythm duration.',
      'Ignored path primitive tie-like-curve because it does not match a reliable rhythm topology.',
      'Ignored reliable glyph grace-sized-note because grace-sized rhythm evidence is unsupported.',
    ]));
  });

  it('rejects overlapping voices at one local x position', () => {
    const result = recognizeRhythmTopology([
      glyph('upper-voice', 'note-quarter', { x1: 100, y1: 35, x2: 112, y2: 62 }),
      glyph('lower-voice', 'note-eighth', { x1: 100, y1: 63, x2: 112, y2: 90 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([]);
    expect(result.warnings).toContain(
      'Ignored overlapping rhythm voices near x=106 because one local position has multiple strong events.',
    );
  });

  it('rejects overlapping voices at one local x even when their vertical bounds are far apart', () => {
    const result = recognizeRhythmTopology([
      glyph('far-upper-voice', 'note-quarter', { x1: 100, y1: 10, x2: 112, y2: 35 }),
      glyph('far-lower-voice', 'note-eighth', { x1: 100, y1: 75, x2: 112, y2: 100 }),
    ], [pairedSystem()]);

    expect(result.events).toEqual([]);
    expect(result.warnings).toContain(
      'Ignored overlapping rhythm voices near x=106 because one local position has multiple strong events.',
    );
  });
});
