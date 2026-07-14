export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  page: number;
}

export interface PdfDocumentSnapshot {
  fileName: string;
  pageCount: number;
  textItems: PdfTextItem[];
  vectorDrawingCount: number;
  imageCount: number;
  timeSignature?: {
    beats: number;
    beatType: number;
  };
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
  warnings: string[];
}
