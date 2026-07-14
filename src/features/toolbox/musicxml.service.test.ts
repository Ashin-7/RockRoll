import { describe, expect, it } from 'vitest';
import { createMusicXml, getMusicXmlFileName } from './musicxml.service';
import type { TabScoreAnalysis } from './toolbox.types';

const analysis: TabScoreAnalysis = {
  fileName: 'A & B.pdf',
  pageCount: 4,
  title: 'A & B <Demo>',
  tempo: 92,
  beats: 4,
  beatType: 4,
  measureNumbers: [1, 2, 3],
  vectorDrawingCount: 1703,
  tabStaffSystems: [],
  fretPositions: [],
  fretEvents: [],
  warnings: ['Note recognition is not available yet; exported measures will contain rests.'],
};

describe('createMusicXml', () => {
  it('creates a valid standard-guitar score skeleton with measure rests and warnings', () => {
    const xml = createMusicXml(analysis);
    const document = new DOMParser().parseFromString(xml, 'application/xml');

    expect(document.querySelector('parsererror')).toBeNull();
    expect(xml).toContain('<work-title>A &amp; B &lt;Demo&gt;</work-title>');
    expect(xml).toContain('<sign>TAB</sign>');
    expect(xml).toContain('<line>5</line>');
    expect(xml).toContain('<staff-lines>6</staff-lines>');
    expect(xml).toContain('<tuning-step>E</tuning-step>');
    expect(xml).toContain('<tuning-step>A</tuning-step>');
    expect(xml).toContain('<tuning-step>D</tuning-step>');
    expect(xml).toContain('<tuning-step>G</tuning-step>');
    expect(xml).toContain('<tuning-step>B</tuning-step>');
    expect(xml).toContain('<per-minute>92</per-minute>');
    expect(xml).toContain('<beats>4</beats>');
    expect(xml).toContain('<beat-type>4</beat-type>');
    expect(document.querySelectorAll('part > measure')).toHaveLength(3);
    expect(document.querySelectorAll('note > rest')).toHaveLength(3);
    expect(xml).toContain('Note recognition is not available yet; exported measures will contain rests.');
  });
});

describe('getMusicXmlFileName', () => {
  it('replaces the PDF extension without changing the display name', () => {
    expect(getMusicXmlFileName('endless rain.PDF')).toBe('endless rain.musicxml');
  });
});
