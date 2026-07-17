import type {
  MeasureRhythmResult,
  RecognizedRhythmEvent,
  RhythmDuration,
  TabFretEvent,
  TabFretPosition,
  TabScoreAnalysis,
} from './toolbox.types';

const divisions = 8;

const durationValues: Record<RhythmDuration, number> = {
  whole: 32,
  half: 16,
  quarter: 8,
  eighth: 4,
  '16th': 2,
};

const openStringMidi: Record<TabFretPosition['stringNumber'], number> = {
  1: 64,
  2: 59,
  3: 55,
  4: 50,
  5: 45,
  6: 40,
};

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

interface ResolvedRhythmEvent {
  event: RecognizedRhythmEvent;
  tabEvent: TabFretEvent | null;
}

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

function getRhythmDuration(event: RecognizedRhythmEvent): number {
  const baseDuration = durationValues[event.duration];
  return event.dots === 1 ? baseDuration + baseDuration / 2 : baseDuration;
}

function getMeasureDuration(analysis: TabScoreAnalysis): number {
  return analysis.beats * divisions * (4 / analysis.beatType);
}

function isSerializablePosition(
  position: TabFretPosition,
  event: RecognizedRhythmEvent,
): boolean {
  return position.page === event.page
    && position.measureNumber === event.measureNumber
    && position.confidence === 'high'
    && Number.isInteger(position.stringNumber)
    && position.stringNumber >= 1
    && position.stringNumber <= 6
    && Number.isInteger(position.fret)
    && position.fret >= 0
    && position.fret <= 24;
}

function resolveRecognizedMeasure(
  analysis: TabScoreAnalysis,
  measureResult: MeasureRhythmResult,
): ResolvedRhythmEvent[] | null {
  if (measureResult.status !== 'recognized' || measureResult.events.length === 0) {
    return null;
  }

  const resolvedEvents: ResolvedRhythmEvent[] = [];
  for (const event of measureResult.events) {
    if (
      event.measureNumber !== measureResult.measureNumber
      || event.confidence !== 'high'
      || (event.dots !== 0 && event.dots !== 1)
    ) {
      return null;
    }

    if (event.isRest) {
      if (event.tabEventOrder !== null) {
        return null;
      }
      resolvedEvents.push({ event, tabEvent: null });
      continue;
    }

    if (event.tabEventOrder === null) {
      return null;
    }
    const matches = analysis.fretEvents.filter((tabEvent) => (
      tabEvent.page === event.page
      && tabEvent.measureNumber === event.measureNumber
      && tabEvent.order === event.tabEventOrder
    ));
    if (
      matches.length !== 1
      || matches[0].confidence !== 'high'
      || matches[0].positions.length === 0
      || matches[0].positions.some((position) => !isSerializablePosition(position, event))
    ) {
      return null;
    }
    resolvedEvents.push({ event, tabEvent: matches[0] });
  }

  const totalDuration = resolvedEvents.reduce((total, { event }) => (
    total + getRhythmDuration(event)
  ), 0);
  return totalDuration === getMeasureDuration(analysis) ? resolvedEvents : null;
}

function createPitchXml(position: TabFretPosition): string {
  const midi = openStringMidi[position.stringNumber] + position.fret;
  const pitchClass = pitchClasses[midi % 12];
  const octave = Math.floor(midi / 12) - 1;

  return `<pitch><step>${pitchClass.step}</step>${pitchClass.alter === 0 ? '' : `<alter>${pitchClass.alter}</alter>`}<octave>${octave}</octave></pitch>`;
}

function createRecognizedEventXml({ event, tabEvent }: ResolvedRhythmEvent): string {
  const duration = getRhythmDuration(event);
  const dotXml = event.dots === 1 ? '<dot/>' : '';

  if (event.isRest) {
    return `
      <note><rest/><duration>${duration}</duration><type>${event.duration}</type>${dotXml}</note>`;
  }

  return tabEvent!.positions.map((position, index) => `
      <note>${index === 0 ? '' : '<chord/>'}${createPitchXml(position)}<duration>${duration}</duration><type>${event.duration}</type>${dotXml}<notations><technical><string>${position.stringNumber}</string><fret>${position.fret}</fret></technical></notations></note>`).join('');
}

function createPlaceholderXml(analysis: TabScoreAnalysis): string {
  return `
      <note><rest measure="yes"/><duration>${getMeasureDuration(analysis)}</duration><type>whole</type></note>`;
}

function createMeasuresXml(
  analysis: TabScoreAnalysis,
  tempo: number,
): { xml: string; fallbackMeasureNumbers: number[] } {
  const fallbackMeasureNumbers: number[] = [];
  const xml = analysis.measureNumbers.map((measure, index) => {
    const measureResults = analysis.rhythmMeasures.filter((result) => (
      result.measureNumber === measure
    ));
    const resolvedEvents = measureResults.length === 1
      ? resolveRecognizedMeasure(analysis, measureResults[0])
      : null;
    if (resolvedEvents === null) {
      fallbackMeasureNumbers.push(measure);
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
      ${resolvedEvents === null
    ? createPlaceholderXml(analysis)
    : resolvedEvents.map(createRecognizedEventXml).join('')}
    </measure>`;
  }).join('');

  return { xml, fallbackMeasureNumbers };
}

export function createMusicXml(analysis: TabScoreAnalysis): string {
  const tempo = analysis.tempo ?? 120;
  const measures = createMeasuresXml(analysis, tempo);
  const fallbackWarning = measures.fallbackMeasureNumbers.length > 0
    ? `Fallback measures: ${measures.fallbackMeasureNumbers.join(', ')}.`
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
