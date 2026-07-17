import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ToolboxPage } from './ToolboxPage';
import type { PdfDocumentSnapshot, TabScoreAnalysis } from './toolbox.types';

const snapshot: PdfDocumentSnapshot = {
  fileName: 'endless rain.pdf',
  pageCount: 4,
  textItems: [],
  vectorDrawingCount: 1703,
  imageCount: 0,
};

const analysis: TabScoreAnalysis = {
  fileName: 'endless rain.pdf',
  pageCount: 4,
  title: 'endless rain',
  tempo: 92,
  beats: 4,
  beatType: 4,
  measureNumbers: Array.from({ length: 18 }, (_, index) => index + 1),
  vectorDrawingCount: 1703,
  tabStaffSystems: [
    { page: 1, x1: 50, x2: 250, stringYs: [100, 110, 120, 130, 140, 150], averageStringGap: 10, confidence: 'high' },
  ],
  fretPositions: [
    { page: 1, measureNumber: 1, stringNumber: 3, fret: 7, x: 80, y: 120, confidence: 'high' },
    { page: 1, measureNumber: 2, stringNumber: 6, fret: 12, x: 260, y: 150, confidence: 'high' },
  ],
  fretEvents: [
    { page: 1, measureNumber: 1, order: 1, x: 80, positions: [], confidence: 'high' },
    { page: 1, measureNumber: 2, order: 1, x: 260, positions: [], confidence: 'high' },
  ],
  rhythmMeasures: [],
  warnings: ['Note recognition is not available yet; exported measures will contain rests.'],
};

const mixedRhythmAnalysis: TabScoreAnalysis = {
  ...analysis,
  measureNumbers: [1, 2, 3],
  rhythmMeasures: [
    {
      measureNumber: 1,
      status: 'recognized',
      events: [
        {
          page: 1,
          measureNumber: 1,
          tabEventOrder: 1,
          duration: 'whole',
          dots: 0,
          isRest: false,
          confidence: 'high',
          sourceSymbols: ['note-whole'],
        },
      ],
      warning: null,
    },
    {
      measureNumber: 2,
      status: 'fallback',
      events: [],
      warning: 'Measure 2 has no uniquely paired TAB event.',
    },
    {
      measureNumber: 3,
      status: 'recognized',
      events: [
        {
          page: 1,
          measureNumber: 3,
          tabEventOrder: null,
          duration: 'whole',
          dots: 0,
          isRest: true,
          confidence: 'high',
          sourceSymbols: ['rest-whole'],
        },
      ],
      warning: null,
    },
  ],
  warnings: ['Measure 2 has no uniquely paired TAB event.'],
};

describe('ToolboxPage', () => {
  it('renders the browser-local PDF tab workflow shell', () => {
    renderWithI18n(<ToolboxPage />);

    expect(screen.getByRole('heading', { name: 'PDF Tab Workbench' })).toBeInTheDocument();
    expect(screen.getByText('Your score stays in this browser. Nothing is uploaded.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Guitar tab PDF/)).toHaveAttribute('accept', 'application/pdf,.pdf');
    expect(screen.getByText('MusicXML for Guitar Pro')).toBeInTheDocument();
  });

  it('analyzes the selected file locally, displays its safe skeleton warning, and downloads MusicXML', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:toolbox-export');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    renderWithI18n(
      <ToolboxPage
        readPdfSnapshot={vi.fn().mockResolvedValue(snapshot)}
        analyzeTabScore={vi.fn().mockReturnValue(analysis)}
        createMusicXml={vi.fn().mockReturnValue('<score-partwise version="4.0"/>')}
        getMusicXmlFileName={vi.fn().mockReturnValue('endless rain.musicxml')}
      />,
    );

    const input = screen.getByLabelText(/Guitar tab PDF/);
    await user.upload(input, new File(['pdf'], 'endless rain.pdf', { type: 'application/pdf' }));

    expect(screen.getByRole('button', { name: 'Download MusicXML' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Analyze locally' }));

    expect(await screen.findByText('endless rain')).toBeInTheDocument();
    expect(screen.getByText('4 pages · 18 measures · 92 BPM')).toBeInTheDocument();
    expect(screen.getByText('2 string/fret positions located')).toBeInTheDocument();
    expect(screen.getByText('2 tab event columns located')).toBeInTheDocument();
    expect(screen.getByText('1 six-string tab systems located')).toBeInTheDocument();
    expect(screen.getByText('Note recognition is not available yet; exported measures will contain rests.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Download MusicXML' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:toolbox-export');
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it('shows checked, recognized, and fallback measure status before mixed export', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <ToolboxPage
        readPdfSnapshot={vi.fn().mockResolvedValue(snapshot)}
        analyzeTabScore={vi.fn().mockReturnValue(mixedRhythmAnalysis)}
      />,
    );

    await user.upload(
      screen.getByLabelText(/Guitar tab PDF/),
      new File(['pdf'], 'endless rain.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: 'Analyze locally' }));

    expect(await screen.findByRole('heading', { name: 'Rhythm check' })).toBeInTheDocument();
    expect(screen.getByText('3 checked measures')).toBeInTheDocument();
    expect(screen.getByText('2 recognized')).toBeInTheDocument();
    expect(screen.getByText('1 fallback')).toBeInTheDocument();
    expect(screen.getByText('Measure 1 · Recognized')).toBeInTheDocument();
    expect(screen.getByText('Measure 2 · Fallback')).toBeInTheDocument();
    expect(screen.getByText('Measure 2 has no uniquely paired TAB event.')).toBeInTheDocument();
    expect(screen.getByText('Fallback measures export as whole-measure rest placeholders.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download MusicXML' })).toBeEnabled();
  });

  it('shows a local analysis error and lets the user retry with another file', async () => {
    const user = userEvent.setup();
    const readPdfSnapshot = vi.fn()
      .mockRejectedValueOnce(new Error('No reliable measure sequence was detected.'))
      .mockResolvedValueOnce(snapshot);

    renderWithI18n(
      <ToolboxPage
        readPdfSnapshot={readPdfSnapshot}
        analyzeTabScore={vi.fn().mockReturnValue(analysis)}
        createMusicXml={vi.fn().mockReturnValue('<score-partwise version="4.0"/>')}
        getMusicXmlFileName={vi.fn().mockReturnValue('endless rain.musicxml')}
      />,
    );

    const input = screen.getByLabelText(/Guitar tab PDF/);
    await user.upload(input, new File(['bad'], 'bad.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: 'Analyze locally' }));

    expect(await screen.findByText('No reliable measure sequence was detected.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download MusicXML' })).toBeDisabled();

    await user.upload(input, new File(['good'], 'endless rain.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: 'Analyze locally' }));
    await waitFor(() => expect(screen.getByText('endless rain')).toBeInTheDocument());
  });
});
