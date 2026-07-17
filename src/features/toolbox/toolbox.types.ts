export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  page: number;
  fontName?: string;
  fontFamily?: string;
}

export interface PdfLineSegment {
  page: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PdfBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type MusicGlyphSemantic =
  | 'note-whole' | 'note-half' | 'note-quarter' | 'note-eighth' | 'note-16th'
  | 'notehead-whole' | 'notehead-half' | 'notehead-filled'
  | 'flag-eighth' | 'flag-16th' | 'augmentation-dot'
  | 'rest-whole' | 'rest-half' | 'rest-quarter' | 'rest-eighth' | 'rest-16th';

export type RhythmDuration = 'whole' | 'half' | 'quarter' | 'eighth' | '16th';

export interface PdfMusicGlyphEvidence {
  page: number;
  bounds: PdfBounds;
  fontName: string | null;
  fontFamily: string | null;
  text: string;
  semantic: MusicGlyphSemantic | null;
  mapping: 'reliable' | 'unknown';
}

export type PdfVectorCommand =
  | { type: 'move' | 'line'; x: number; y: number }
  | { type: 'curve'; x1: number; y1: number; x2: number; y2: number; x: number; y: number };

export interface PdfVectorSubpath {
  commands: PdfVectorCommand[];
  closed: boolean;
}

export interface PdfPaintedShape {
  page: number;
  paint: 'fill' | 'stroke' | 'fill-stroke';
  fillRule: 'nonzero' | 'evenodd';
  strokeWidth: number | null;
  subpaths: PdfVectorSubpath[];
  bounds: PdfBounds;
}

export interface PdfDocumentSnapshot {
  fileName: string;
  pageCount: number;
  textItems: PdfTextItem[];
  vectorDrawingCount: number;
  imageCount: number;
  lineSegments?: PdfLineSegment[];
  vectorShapes?: PdfPaintedShape[];
  musicGlyphs?: PdfMusicGlyphEvidence[];
  timeSignature?: {
    beats: number;
    beatType: number;
  };
}

export interface TabFretPosition {
  page: number;
  measureNumber: number;
  stringNumber: 1 | 2 | 3 | 4 | 5 | 6;
  fret: number;
  x: number;
  y: number;
  confidence: 'high' | 'medium';
}

export interface TabGeometryResult {
  positions: TabFretPosition[];
  warnings: string[];
}

export interface TabFretEvent {
  page: number;
  measureNumber: number;
  order: number;
  x: number;
  positions: TabFretPosition[];
  confidence: 'high' | 'medium';
}

export interface TabFretEventResult {
  events: TabFretEvent[];
  warnings: string[];
}

export interface RecognizedRhythmEvent {
  page: number;
  measureNumber: number;
  tabEventOrder: number | null;
  duration: RhythmDuration;
  dots: 0 | 1;
  isRest: boolean;
  confidence: 'high' | 'medium';
  sourceSymbols: string[];
}

export interface MeasureRhythmResult {
  measureNumber: number;
  status: 'recognized' | 'fallback';
  events: RecognizedRhythmEvent[];
  warning: string | null;
}

export interface TabStaffSystem {
  page: number;
  x1: number;
  x2: number;
  stringYs: [number, number, number, number, number, number];
  averageStringGap: number;
  confidence: 'high' | 'medium';
}

export interface PairedStaffSystem {
  page: number;
  x1: number;
  x2: number;
  standardLineYs: [number, number, number, number, number];
  averageStaffGap: number;
  tabSystem: TabStaffSystem;
  confidence: 'high' | 'medium';
}

export interface TabScoreAnalysis {
  fileName: string;
  pageCount: number;
  title: string;
  tempo: number | null;
  beats: number;
  beatType: number;
  measureNumbers: number[];
  vectorDrawingCount: number;
  tabStaffSystems: TabStaffSystem[];
  fretPositions: TabFretPosition[];
  fretEvents: TabFretEvent[];
  rhythmMeasures: MeasureRhythmResult[];
  warnings: string[];
}
