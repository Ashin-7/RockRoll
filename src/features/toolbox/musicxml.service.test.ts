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
  fretEvents: [
    {
      page: 1,
      measureNumber: 1,
      order: 0,
      x: 120,
      positions: [
        { page: 1, measureNumber: 1, stringNumber: 1, fret: 1, x: 120, y: 80, confidence: 'high' },
        { page: 1, measureNumber: 1, stringNumber: 2, fret: 2, x: 120, y: 90, confidence: 'high' },
        { page: 1, measureNumber: 1, stringNumber: 6, fret: 2, x: 120, y: 130, confidence: 'high' },
      ],
      confidence: 'high',
    },
  ],
  rhythmMeasures: [
    {
      measureNumber: 1,
      status: 'recognized',
      events: [
        {
          page: 1,
          measureNumber: 1,
          tabEventOrder: 0,
          duration: 'eighth',
          dots: 1,
          isRest: false,
          confidence: 'high',
          sourceSymbols: ['note'],
        },
        {
          page: 1,
          measureNumber: 1,
          tabEventOrder: null,
          duration: '16th',
          dots: 0,
          isRest: true,
          confidence: 'high',
          sourceSymbols: ['rest'],
        },
      ],
      warning: null,
    },
    { measureNumber: 2, status: 'fallback', events: [], warning: 'Rhythm recognition failed.' },
    {
      measureNumber: 3,
      status: 'recognized',
      events: [
        {
          page: 2,
          measureNumber: 3,
          tabEventOrder: 0,
          duration: 'quarter',
          dots: 0,
          isRest: false,
          confidence: 'medium',
          sourceSymbols: ['note'],
        },
      ],
      warning: null,
    },
  ],
  warnings: ['Some measures require fallback export.'],
};

describe('createMusicXml', () => {
  it('creates valid MusicXML with standard guitar metadata and integer divisions', () => {
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
    expect(xml).toContain('<divisions>8</divisions>');
    expect(document.querySelectorAll('part > measure')).toHaveLength(3);
    expect(xml).toContain('Some measures require fallback export.');
  });

  it('exports recognized notes, chord positions, pitch, technical data, and explicit rests', () => {
    const document = new DOMParser().parseFromString(createMusicXml(analysis), 'application/xml');
    const measure = document.querySelector('measure[number="1"]')!;
    const notes = measure.querySelectorAll(':scope > note');

    expect(notes).toHaveLength(4);
    expect(notes[0].querySelector('pitch > step')?.textContent).toBe('F');
    expect(notes[0].querySelector('pitch > octave')?.textContent).toBe('2');
    expect(notes[0].querySelector('duration')?.textContent).toBe('6');
    expect(notes[0].querySelector('type')?.textContent).toBe('eighth');
    expect(notes[0].querySelector('dot')).not.toBeNull();
    expect(notes[0].querySelector('technical > string')?.textContent).toBe('1');
    expect(notes[0].querySelector('technical > fret')?.textContent).toBe('1');

    expect(notes[1].querySelector('chord')).not.toBeNull();
    expect(notes[1].querySelector('pitch > step')?.textContent).toBe('B');
    expect(notes[1].querySelector('pitch > octave')?.textContent).toBe('2');
    expect(notes[1].querySelector('duration')?.textContent).toBe('6');
    expect(notes[1].querySelector('technical > string')?.textContent).toBe('2');
    expect(notes[1].querySelector('technical > fret')?.textContent).toBe('2');

    expect(notes[2].querySelector('chord')).not.toBeNull();
    expect(notes[2].querySelector('pitch > step')?.textContent).toBe('F');
    expect(notes[2].querySelector('pitch > alter')?.textContent).toBe('1');
    expect(notes[2].querySelector('pitch > octave')?.textContent).toBe('4');
    expect(notes[2].querySelector('technical > string')?.textContent).toBe('6');

    expect(notes[3].querySelector('rest:not([measure])')).not.toBeNull();
    expect(notes[3].querySelector('duration')?.textContent).toBe('2');
    expect(notes[3].querySelector('type')?.textContent).toBe('16th');
  });

  it('falls back for explicit fallback and unresolved recognized measures without partial notes', () => {
    const document = new DOMParser().parseFromString(createMusicXml(analysis), 'application/xml');

    for (const measureNumber of [2, 3]) {
      const measure = document.querySelector(`measure[number="${measureNumber}"]`)!;
      const notes = measure.querySelectorAll(':scope > note');

      expect(notes).toHaveLength(1);
      expect(notes[0].querySelector('rest[measure="yes"]')).not.toBeNull();
      expect(notes[0].querySelector('duration')?.textContent).toBe('32');
      expect(notes[0].querySelector('pitch')).toBeNull();
      expect(notes[0].querySelector('technical')).toBeNull();
    }

    expect(document.querySelector('credit-words')?.textContent).toContain('Fallback measures: 2, 3');
  });
});

describe('getMusicXmlFileName', () => {
  it('replaces the PDF extension without changing the display name', () => {
    expect(getMusicXmlFileName('endless rain.PDF')).toBe('endless rain.musicxml');
  });
});
