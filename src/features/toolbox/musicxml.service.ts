import type { TabScoreAnalysis } from './toolbox.types';

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

function createMeasuresXml(analysis: TabScoreAnalysis, tempo: number): string {
  return analysis.measureNumbers.map((measure, index) => `
    <measure number="${measure}">${index === 0 ? `
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>${analysis.beats}</beats><beat-type>${analysis.beatType}</beat-type></time>
        <clef><sign>TAB</sign><line>5</line></clef>
        <staff-details><staff-lines>6</staff-lines>${createTuningXml()}
        </staff-details>
      </attributes>
      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>` : ''}
      <note><rest measure="yes"/><duration>${analysis.beats}</duration><type>whole</type></note>
    </measure>`).join('');
}

export function createMusicXml(analysis: TabScoreAnalysis): string {
  const tempo = analysis.tempo ?? 120;
  const warningText = escapeXml(analysis.warnings.join(' '));

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${escapeXml(analysis.title)}</work-title></work>
  <identification><encoding><software>RockRoll PDF Tab Workbench</software></encoding></identification>
  <credit page="1"><credit-words>${warningText}</credit-words></credit>
  <part-list><score-part id="P1"><part-name>Guitar</part-name><part-abbreviation>Gtr.</part-abbreviation></score-part></part-list>
  <part id="P1">${createMeasuresXml(analysis, tempo)}
  </part>
</score-partwise>`;
}

export function getMusicXmlFileName(pdfName: string): string {
  return `${pdfName.replace(/\.pdf$/i, '')}.musicxml`;
}
