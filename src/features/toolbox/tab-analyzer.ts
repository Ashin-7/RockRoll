import { locateTabFrets } from './tab-geometry';
import { groupTabFretEvents } from './tab-events';
import { buildMeasureRhythmResults } from './rhythm-measures';
import { recognizeRhythmGlyphs } from './rhythm-symbols';
import { findPairedStaffSystems } from './staff-tab-alignment';
import { findTabStaffSystems } from './tab-staff-geometry';
import { PdfDocumentSnapshot, PdfTextItem, TabScoreAnalysis } from './toolbox.types';

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function normalizeText(value: string): string {
  return value.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function findTitle(textItems: PdfTextItem[], fileName: string): string {
  const titleItem = textItems
    .filter((item) => /[A-Za-z\u3400-\u9fff]/.test(item.text))
    .sort((left, right) => right.fontSize - left.fontSize)[0];

  return titleItem ? normalizeText(titleItem.text) : fileName.replace(/\.pdf$/i, '');
}

function findTempo(textItems: PdfTextItem[]): number | null {
  for (const item of textItems) {
    const match = normalizeText(item.text).match(/^=\s*(\d{2,3})$/);
    if (match) {
      const tempo = Number(match[1]);
      if (tempo >= 20 && tempo <= 400) {
        return tempo;
      }
    }
  }

  return null;
}

function findMeasureNumbers(textItems: PdfTextItem[]): number[] {
  const candidates = textItems
    .filter((item) => /^\d{1,3}$/.test(item.text.trim()) && Math.abs(item.fontSize - 8) <= 0.05)
    .sort((left, right) => left.page - right.page || right.y - left.y || left.x - right.x)
    .map((item) => Number(item.text));

  let longest: number[] = [];
  let current: number[] = [];

  candidates.forEach((value) => {
    if (current.length === 0 || value === current[current.length - 1] + 1) {
      current.push(value);
    } else {
      current = [value];
    }

    if (current.length > longest.length) {
      longest = [...current];
    }
  });

  return longest;
}

export function validatePdfFile(file: File): void {
  const hasPdfName = file.name.toLowerCase().endsWith('.pdf');
  const hasPdfType = file.type === 'application/pdf';

  if (!hasPdfName || (file.type && !hasPdfType)) {
    throw new Error('Choose a PDF file.');
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error('PDF files must be 20 MB or smaller.');
  }
}

export function analyzeTabScore(snapshot: PdfDocumentSnapshot): TabScoreAnalysis {
  if (snapshot.textItems.length === 0 && snapshot.vectorDrawingCount === 0 && snapshot.imageCount > 0) {
    throw new Error('Scanned or image-only PDFs are not supported yet.');
  }

  const measureNumbers = findMeasureNumbers(snapshot.textItems);
  if (measureNumbers.length < 2) {
    throw new Error('No reliable measure sequence was detected.');
  }

  const tempo = findTempo(snapshot.textItems);
  const timeSignature = snapshot.timeSignature ?? { beats: 4, beatType: 4 };
  const tabStaffSystems = findTabStaffSystems(snapshot.lineSegments ?? []);
  const geometry = locateTabFrets(snapshot.textItems, measureNumbers, tabStaffSystems);
  const fretEvents = groupTabFretEvents(geometry.positions);
  const pairedSystems = findPairedStaffSystems(snapshot.lineSegments ?? [], tabStaffSystems)
    .filter((system) => system.confidence === 'high');
  const rhythmGlyphs = recognizeRhythmGlyphs(snapshot.vectorPaths ?? [], pairedSystems);
  const rhythmMeasures = snapshot.vectorPaths && pairedSystems.length > 0
    ? buildMeasureRhythmResults({
        glyphs: rhythmGlyphs.glyphs,
        tabEvents: fretEvents.events,
        pairedSystems,
        measureNumbers,
        beats: timeSignature.beats,
        beatType: timeSignature.beatType,
      })
    : [];
  const warnings: string[] = [];

  if (!snapshot.timeSignature) {
    warnings.push('Time signature was not detected; 4/4 will be used.');
  }
  if (tempo === null) {
    warnings.push('Tempo was not detected; 120 BPM will be used.');
  }
  warnings.push(...geometry.warnings);
  warnings.push(...fretEvents.warnings);
  warnings.push(...rhythmGlyphs.warnings);
  warnings.push('Note recognition is not available yet; exported measures will contain rests.');
  if (geometry.positions.length > 0 && rhythmMeasures.length === 0) {
    warnings.push('Rhythm and technique recognition are not available yet.');
  }
  if (pairedSystems.length === 0) {
    warnings.push('No reliable paired staff was detected; exported measures will use the safe rest skeleton.');
  } else if (!snapshot.vectorPaths) {
    warnings.push('Rhythm vector paths were unavailable; exported measures will use the safe rest skeleton.');
  }
  rhythmMeasures
    .filter((measure) => measure.status === 'fallback')
    .forEach((measure) => {
      warnings.push(
        `Measure ${measure.measureNumber} rhythm could not be confirmed; safe export fallback will be used.`,
      );
    });

  return {
    fileName: snapshot.fileName,
    pageCount: snapshot.pageCount,
    title: findTitle(snapshot.textItems, snapshot.fileName),
    tempo,
    beats: timeSignature.beats,
    beatType: timeSignature.beatType,
    measureNumbers,
    vectorDrawingCount: snapshot.vectorDrawingCount,
    tabStaffSystems,
    fretPositions: geometry.positions,
    fretEvents: fretEvents.events,
    rhythmMeasures,
    warnings,
  };
}
