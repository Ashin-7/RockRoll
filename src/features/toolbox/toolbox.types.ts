export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  page: number;
}

export interface PdfLineSegment {
  page: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type PdfVectorCommand =
  | { type: 'move'; x: number; y: number }
  | { type: 'line'; x: number; y: number }
  | { type: 'curve'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'close' };

export interface PdfVectorPath {
  page: number;
  paint: 'fill' | 'stroke' | 'fill-stroke';
  commands: PdfVectorCommand[];
  bounds: { x1: number; y1: number; x2: number; y2: number };
}

export interface PdfDocumentSnapshot {
  fileName: string;
  pageCount: number;
  textItems: PdfTextItem[];
  vectorDrawingCount: number;
  imageCount: number;
  lineSegments?: PdfLineSegment[];
  vectorPaths?: PdfVectorPath[];
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
  warnings: string[];
}
