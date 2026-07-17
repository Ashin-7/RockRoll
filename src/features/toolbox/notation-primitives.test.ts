import { describe, expect, it } from 'vitest';
import { normalizeNotationEvidence } from './notation-primitives';
import type {
  PairedStaffSystem,
  PdfBounds,
  PdfMusicGlyphEvidence,
  PdfPaintedShape,
  PdfVectorSubpath,
} from './toolbox.types';

function rectangleSubpath(bounds: PdfBounds): PdfVectorSubpath {
  return {
    closed: true,
    commands: [
      { type: 'move', x: bounds.x1, y: bounds.y1 },
      { type: 'line', x: bounds.x2, y: bounds.y1 },
      { type: 'line', x: bounds.x2, y: bounds.y2 },
      { type: 'line', x: bounds.x1, y: bounds.y2 },
    ],
  };
}

function lineSubpath(x1: number, y1: number, x2: number, y2: number): PdfVectorSubpath {
  return {
    closed: false,
    commands: [
      { type: 'move', x: x1, y: y1 },
      { type: 'line', x: x2, y: y2 },
    ],
  };
}

function pairedSystem(
  standardLineYs: PairedStaffSystem['standardLineYs'] = [40, 45, 50, 55, 60],
  overrides: Partial<PairedStaffSystem> = {},
): PairedStaffSystem {
  const averageStaffGap = (standardLineYs[4] - standardLineYs[0]) / 4;
  const tabStart = standardLineYs[4] + averageStaffGap * 4;

  return {
    page: 1,
    x1: 50,
    x2: 250,
    standardLineYs,
    averageStaffGap,
    tabSystem: {
      page: 1,
      x1: 50,
      x2: 250,
      stringYs: [tabStart, tabStart + 10, tabStart + 20, tabStart + 30, tabStart + 40, tabStart + 50],
      averageStringGap: 10,
      confidence: 'high',
    },
    confidence: 'high',
    ...overrides,
  };
}

function paintedShape(overrides: Partial<PdfPaintedShape> = {}): PdfPaintedShape {
  const bounds = overrides.bounds ?? { x1: 70, y1: 44, x2: 82, y2: 52 };
  return {
    page: 1,
    paint: 'fill',
    fillRule: 'nonzero',
    strokeWidth: null,
    subpaths: [rectangleSubpath(bounds)],
    bounds,
    ...overrides,
  };
}

function glyphEvidence(overrides: Partial<PdfMusicGlyphEvidence> = {}): PdfMusicGlyphEvidence {
  return {
    page: 1,
    bounds: { x1: 90, y1: 44, x2: 98, y2: 52 },
    fontName: 'MusicFont',
    fontFamily: 'Bravura',
    text: '\uE0A4',
    semantic: 'notehead-filled',
    mapping: 'reliable',
    ...overrides,
  };
}

describe('normalizeNotationEvidence', () => {
  it('splits spatially disconnected subpaths from one compound shape deterministically', () => {
    const leftBounds = { x1: 70, y1: 44, x2: 82, y2: 52 };
    const rightBounds = { x1: 120, y1: 44, x2: 132, y2: 52 };
    const input = {
      shapes: [paintedShape({
        bounds: { x1: 70, y1: 44, x2: 132, y2: 52 },
        subpaths: [rectangleSubpath(leftBounds), rectangleSubpath(rightBounds)],
      })],
      glyphs: [],
      pairedSystems: [pairedSystem()],
    };

    const result = normalizeNotationEvidence(input);

    expect(result.primitives).toEqual([
      {
        id: 'shape-0-contour-0',
        kind: 'contour',
        page: 1,
        systemIndex: 0,
        bounds: leftBounds,
        closed: true,
        hasHole: false,
        filled: true,
        quality: 'reliable',
        sourceIds: ['shape-0'],
      },
      {
        id: 'shape-0-contour-1',
        kind: 'contour',
        page: 1,
        systemIndex: 0,
        bounds: rightBounds,
        closed: true,
        hasHole: false,
        filled: true,
        quality: 'reliable',
        sourceIds: ['shape-0'],
      },
    ]);
    expect(normalizeNotationEvidence(input)).toEqual(result);
  });

  it('keeps a tangent Bezier and line together while splitting a clearly distant curve', () => {
    const touchingCurveBounds = { x1: 70, y1: 44, x2: 80, y2: 54 };
    const distantCurveBounds = { x1: 100, y1: 44, x2: 110, y2: 54 };
    const touchingCurve: PdfVectorSubpath = {
      closed: false,
      commands: [
        { type: 'move', x: 70, y: 44 },
        {
          type: 'curve',
          x1: 73.333333333333,
          y1: 44,
          x2: 76.666666666667,
          y2: 47.333333333333,
          x: 80,
          y: 54,
        },
      ],
    };
    const tangent = lineSubpath(72.5, 44.6, 73.5, 45.2);
    const distantCurve: PdfVectorSubpath = {
      closed: false,
      commands: touchingCurve.commands.map((command) => {
        if (command.type === 'curve') {
          return {
            ...command,
            x1: command.x1 + 30,
            x2: command.x2 + 30,
            x: command.x + 30,
          };
        }
        return { ...command, x: command.x + 30 };
      }),
    };

    const result = normalizeNotationEvidence({
      shapes: [paintedShape({
        bounds: { x1: 70, y1: 44, x2: 110, y2: 54 },
        subpaths: [touchingCurve, tangent, distantCurve],
      })],
      glyphs: [],
      pairedSystems: [pairedSystem()],
    });

    expect(result.primitives).toEqual([
      expect.objectContaining({ kind: 'contour', bounds: touchingCurveBounds }),
      expect.objectContaining({ kind: 'contour', bounds: distantCurveBounds }),
    ]);
  });

  it('uses the uniquely containing system gap for local curve connection tolerance', () => {
    const curveBounds = { x1: 80, y1: 170, x2: 90, y2: 180 };
    const connectedBounds = { x1: 80, y1: 170, x2: 92, y2: 182.075 };
    const curve: PdfVectorSubpath = {
      closed: false,
      commands: [
        { type: 'move', x: 80, y: 170 },
        { type: 'curve', x1: 83, y1: 170, x2: 87, y2: 176, x: 90, y: 180 },
      ],
    };
    const nearbyLine = lineSubpath(90, 180.075, 92, 182.075);

    const result = normalizeNotationEvidence({
      shapes: [paintedShape({
        bounds: connectedBounds,
        subpaths: [curve, nearbyLine],
      })],
      glyphs: [],
      pairedSystems: [
        pairedSystem(),
        pairedSystem([160, 170, 180, 190, 200]),
      ],
    });

    expect(result.primitives).toEqual([
      expect.objectContaining({
        kind: 'contour',
        systemIndex: 1,
        bounds: connectedBounds,
      }),
    ]);
    expect(curveBounds.y2 + 0.05).toBeLessThan(nearbyLine.commands[0].y);
    expect(curveBounds.y2 + 0.1).toBeGreaterThan(nearbyLine.commands[0].y);
  });

  it('keeps nested subpaths together and derives even-odd hole evidence from containment', () => {
    const outerBounds = { x1: 70, y1: 42, x2: 90, y2: 56 };
    const innerBounds = { x1: 76, y1: 46, x2: 84, y2: 52 };

    const result = normalizeNotationEvidence({
      shapes: [paintedShape({
        bounds: outerBounds,
        fillRule: 'evenodd',
        subpaths: [rectangleSubpath(outerBounds), rectangleSubpath(innerBounds)],
      })],
      glyphs: [],
      pairedSystems: [pairedSystem()],
    });

    expect(result.primitives).toEqual([
      expect.objectContaining({
        kind: 'contour',
        bounds: outerBounds,
        closed: true,
        hasHole: true,
        filled: true,
        quality: 'reliable',
        sourceIds: ['shape-0'],
      }),
    ]);
  });

  it('normalizes a thin stroked stem into a reliable segment without changing its bounds', () => {
    const bounds = { x1: 96, y1: 41, x2: 96, y2: 59 };

    const result = normalizeNotationEvidence({
      shapes: [paintedShape({
        bounds,
        paint: 'stroke',
        strokeWidth: 0.6,
        subpaths: [lineSubpath(bounds.x1, bounds.y1, bounds.x2, bounds.y2)],
      })],
      glyphs: [],
      pairedSystems: [pairedSystem()],
    });

    expect(result.primitives).toEqual([{
      id: 'shape-0-segment-0',
      kind: 'segment',
      page: 1,
      systemIndex: 0,
      bounds,
      quality: 'reliable',
      sourceIds: ['shape-0'],
    }]);
  });

  it('keeps a linear stroke with unavailable width as an uncertain segment', () => {
    const bounds = { x1: 104, y1: 42, x2: 104, y2: 58 };

    const result = normalizeNotationEvidence({
      shapes: [paintedShape({
        bounds,
        paint: 'stroke',
        strokeWidth: null,
        subpaths: [lineSubpath(bounds.x1, bounds.y1, bounds.x2, bounds.y2)],
      })],
      glyphs: [],
      pairedSystems: [pairedSystem()],
    });

    expect(result.primitives).toEqual([
      expect.objectContaining({ kind: 'segment', bounds, quality: 'uncertain' }),
    ]);
  });

  it('uses the stroke channel of an open linear fill-stroke shape as an uncertain segment', () => {
    const bounds = { x1: 112, y1: 42, x2: 112, y2: 58 };

    const result = normalizeNotationEvidence({
      shapes: [paintedShape({
        bounds,
        paint: 'fill-stroke',
        strokeWidth: null,
        subpaths: [lineSubpath(bounds.x1, bounds.y1, bounds.x2, bounds.y2)],
      })],
      glyphs: [],
      pairedSystems: [pairedSystem()],
    });

    expect(result.primitives).toEqual([
      expect.objectContaining({ kind: 'segment', bounds, quality: 'uncertain' }),
    ]);
  });

  it('preserves reliable mapped glyphs and unknown glyphs as distinct primitive kinds', () => {
    const reliable = glyphEvidence();
    const unknown = glyphEvidence({
      bounds: { x1: 108, y1: 44, x2: 116, y2: 52 },
      text: '\uE0FF',
      semantic: null,
      mapping: 'unknown',
    });

    const result = normalizeNotationEvidence({
      shapes: [],
      glyphs: [reliable, unknown],
      pairedSystems: [pairedSystem()],
    });

    expect(result.primitives).toEqual([
      {
        id: 'glyph-0',
        kind: 'glyph',
        page: 1,
        systemIndex: 0,
        bounds: reliable.bounds,
        semantic: 'notehead-filled',
        quality: 'reliable',
        sourceIds: ['glyph-0'],
      },
      {
        id: 'glyph-1',
        kind: 'unknown-glyph',
        page: 1,
        systemIndex: 0,
        bounds: unknown.bounds,
        quality: 'uncertain',
        sourceIds: ['glyph-1'],
      },
    ]);
  });

  it('uses staff-gap scaling for equivalent stems while preserving each source coordinate space', () => {
    const smallBounds = { x1: 96, y1: 41, x2: 96, y2: 59 };
    const largeBounds = { x1: 96, y1: 102, x2: 96, y2: 138 };
    const largeSystem = pairedSystem([100, 110, 120, 130, 140], {
      page: 2,
      averageStaffGap: 10,
      tabSystem: {
        page: 2,
        x1: 50,
        x2: 250,
        stringYs: [180, 190, 200, 210, 220, 230],
        averageStringGap: 10,
        confidence: 'high',
      },
    });

    const result = normalizeNotationEvidence({
      shapes: [
        paintedShape({
          bounds: smallBounds,
          paint: 'stroke',
          strokeWidth: 0.6,
          subpaths: [lineSubpath(smallBounds.x1, smallBounds.y1, smallBounds.x2, smallBounds.y2)],
        }),
        paintedShape({
          page: 2,
          bounds: largeBounds,
          paint: 'stroke',
          strokeWidth: 1.2,
          subpaths: [lineSubpath(largeBounds.x1, largeBounds.y1, largeBounds.x2, largeBounds.y2)],
        }),
      ],
      glyphs: [],
      pairedSystems: [pairedSystem(), largeSystem],
    });

    expect(result.primitives).toEqual([
      expect.objectContaining({ kind: 'segment', systemIndex: 0, bounds: smallBounds, quality: 'reliable' }),
      expect.objectContaining({ kind: 'segment', systemIndex: 1, bounds: largeBounds, quality: 'reliable' }),
    ]);
  });

  it('assigns evidence once within the matching same-page paired system and excludes TAB-area evidence', () => {
    const secondSystem = pairedSystem([160, 165, 170, 175, 180], {
      tabSystem: {
        page: 1,
        x1: 50,
        x2: 250,
        stringYs: [200, 210, 220, 230, 240, 250],
        averageStringGap: 10,
        confidence: 'high',
      },
    });
    const firstBounds = { x1: 70, y1: 46, x2: 80, y2: 54 };
    const secondBounds = { x1: 70, y1: 166, x2: 80, y2: 174 };
    const tabBounds = { x1: 70, y1: 100, x2: 80, y2: 108 };

    const result = normalizeNotationEvidence({
      shapes: [
        paintedShape({ bounds: firstBounds, subpaths: [rectangleSubpath(firstBounds)] }),
        paintedShape({ bounds: secondBounds, subpaths: [rectangleSubpath(secondBounds)] }),
        paintedShape({ bounds: tabBounds, subpaths: [rectangleSubpath(tabBounds)] }),
      ],
      glyphs: [],
      pairedSystems: [pairedSystem(), secondSystem],
    });

    expect(result.primitives).toHaveLength(2);
    expect(result.primitives).toEqual([
      expect.objectContaining({ systemIndex: 0, bounds: firstBounds }),
      expect.objectContaining({ systemIndex: 1, bounds: secondBounds }),
    ]);
    expect(result.warnings).toContain('Ignored shape-2 because it is outside every paired standard-staff system.');
  });

  it('rejects one connected primitive whose bounds cross from a standard staff into its TAB area', () => {
    const crossingBounds = { x1: 70, y1: 50, x2: 82, y2: 90 };

    const result = normalizeNotationEvidence({
      shapes: [paintedShape({
        bounds: crossingBounds,
        subpaths: [rectangleSubpath(crossingBounds)],
      })],
      glyphs: [],
      pairedSystems: [pairedSystem()],
    });

    expect(result.primitives).toEqual([]);
    expect(result.warnings).toContain(
      'Ignored shape-0 because it is outside every paired standard-staff system.',
    );
  });
});
