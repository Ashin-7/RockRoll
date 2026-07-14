import type { RecognizedRhythmEvent, RhythmDuration, TabFretEvent, TabFretPosition, TabScoreAnalysis } from './toolbox.types';

const divisions = 8;
const musicXmlDuration: Record<RhythmDuration, number> = {
  whole: 32,
  half: 16,
  quarter: 8,
  eighth: 4,
  '16th': 2,
};

const openStringMidi = [40, 45, 50, 55, 59, 64] as const;
const pitchClasses = [
  { step: 'C', alter: 0 },
  { step: 'C', alter: 1 },
  { step: 'D', alter: 0 },
  { step: 'D', alter: 1 },
  { step: 'E', alter: 0 },
  { step: 'F', alter: 0 },
  { step: 'F', alter: 1 },
  { step: 'G', alter: 0 },
  { step: 'G', alter: 1 },
  { step: 'A', alter: 0 },
  { step: 'A', alter: 1 },
  { step: 'B', alter: 0 },
] as const;

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
}

function createTuningXml(): string {
  const strings = [
    ['E', '2'], ['A', '2'], ['D', '3'], ['G', '3'], ['B', '3'], ['E', '4'],
  ];

  return strings.map(([step, octave], index) => `
            <staff-tuning line="${index + 1}">
              <tuning-step>${step}</tuning-step>
              <tuning-octave>${octave}</tuning-octave>
            </staff-tuning>`).join('');
}

function createPitchXml(position: TabFretPosition): string {
  const midi = openStringMidi[position.stringNumber - 1] + position.fret;
  const pitch = pitchClasses[midi % 12];
  const octave = Math.floor(midi / 12) - 1;

  return `<pitch><step>${pitch.step}</step>${pitch.alter === 0 ? '' : `<alter>${pitch.alter}</alter>`}<octave>${octave}</octave></pitch>`;
}

function getEventDuration(event: RecognizedRhythmEvent): number {
  return musicXmlDuration[event.duration] * (event.dots === 1 ? 1.5 : 1);
}

function createRestXml(event: RecognizedRhythmEvent): string {
  return `
      <note><rest/><duration>${getEventDuration(event)}</duration><type>${event.duration}</type>${event.dots === 1 ? '<dot/>' : ''}</note>`;
}

function createFretEventXml(event: RecognizedRhythmEvent, fretEvent: TabFretEvent): string {
  const duration = getEventDuration(event);

  return fretEvent.positions.map((position, index) => `
      <note>${index === 0 ? '' : '<chord/>'}${createPitchXml(position)}<duration>${duration}</duration><type>${event.duration}</type>${event.dots === 1 ? '<dot/>' : ''}<notations><technical><string>${7 - position.stringNumber}</string><fret>${position.fret}</fret></technical></notations></note>`).join('');
}

function getFallbackDuration(analysis: TabScoreAnalysis): number {
  const duration = analysis.beats * divisions * 4 / analysis.beatType;

  if (!Number.isInteger(duration)) {
    throw new Error('MusicXML fallback measure duration must be an integer.');
  }

  return duration;
}

function createFallbackMeasureContent(analysis: TabScoreAnalysis): string {
  return `
      <note><rest measure="yes"/><duration>${getFallbackDuration(analysis)}</duration></note>`;
}

function createRecognizedMeasureContent(analysis: TabScoreAnalysis, measure: number): string | null {
  const rhythmMeasure = analysis.rhythmMeasures.find((candidate) => candidate.measureNumber === measure);
  if (rhythmMeasure?.status !== 'recognized' || rhythmMeasure.events.length === 0) {
    return null;
  }

  const resolvedEvents: Array<{ rhythmEvent: RecognizedRhythmEvent; fretEvent: TabFretEvent | null }> = [];
  for (const rhythmEvent of rhythmMeasure.events) {
    if (rhythmEvent.isRest) {
      resolvedEvents.push({ rhythmEvent, fretEvent: null });
      continue;
    }

    const fretEvent = analysis.fretEvents.find((candidate) => (
      candidate.measureNumber === measure && candidate.order === rhythmEvent.tabEventOrder
    ));
    if (!fretEvent || fretEvent.positions.length === 0) {
      return null;
    }
    resolvedEvents.push({ rhythmEvent, fretEvent });
  }

  return resolvedEvents.map(({ rhythmEvent, fretEvent }) => (
    fretEvent ? createFretEventXml(rhythmEvent, fretEvent) : createRestXml(rhythmEvent)
  )).join('');
}

function createMeasuresXml(analysis: TabScoreAnalysis, tempo: number): { xml: string; fallbackMeasures: number[] } {
  const fallbackMeasures: number[] = [];
  const xml = analysis.measureNumbers.map((measure, index) => {
    const recognizedContent = createRecognizedMeasureContent(analysis, measure);
    const measureContent = recognizedContent ?? createFallbackMeasureContent(analysis);
    if (recognizedContent === null) {
      fallbackMeasures.push(measure);
    }

    return `
    <measure number="${measure}">${index === 0 ? `
      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>${analysis.beats}</beats><beat-type>${analysis.beatType}</beat-type></time>
        <clef><sign>TAB</sign><line>5</line></clef>
        <staff-details><staff-lines>6</staff-lines>${createTuningXml()}
        </staff-details>
      </attributes>
      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>` : ''}
${measureContent}
    </measure>`;
  }).join('');

  return { xml, fallbackMeasures };
}

export function createMusicXml(analysis: TabScoreAnalysis): string {
  const tempo = analysis.tempo ?? 120;
  const measures = createMeasuresXml(analysis, tempo);
  const fallbackWarning = measures.fallbackMeasures.length > 0
    ? `Fallback measures: ${measures.fallbackMeasures.join(', ')}`
    : '';
  const warningText = escapeXml([...analysis.warnings, fallbackWarning].filter(Boolean).join(' '));

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${escapeXml(analysis.title)}</work-title></work>
  <identification><encoding><software>RockRoll PDF Tab Workbench</software></encoding></identification>
  <credit page="1"><credit-words>${warningText}</credit-words></credit>
  <part-list><score-part id="P1"><part-name>Guitar</part-name><part-abbreviation>Gtr.</part-abbreviation></score-part></part-list>
  <part id="P1">${measures.xml}
  </part>
</score-partwise>`;
}

export function getMusicXmlFileName(pdfName: string): string {
  return `${pdfName.replace(/\.pdf$/i, '')}.musicxml`;
}
