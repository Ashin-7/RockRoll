import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { PracticeHistoryPage } from './PracticeHistoryPage';

describe('PracticeHistoryPage', () => {
  it('loads practice history records and statistics by default', async () => {
    const onLoadSessions = vi.fn().mockResolvedValue([
      {
        id: 'practice-1',
        songTitle: 'Little Wing',
        artistName: 'Unknown artist',
        practicedOn: '2026-07-01',
        durationMinutes: 45,
        bpm: 92,
        focusArea: 'Verse rhythm and bends',
        reflection: 'Timing is tighter than yesterday.',
      },
    ]);

    renderWithI18n(<PracticeHistoryPage onLoadSessions={onLoadSessions} />);

    expect(screen.getByText('Practice History')).toBeInTheDocument();
    expect(screen.getByText('Loading practice history...')).toBeInTheDocument();
    expect(await screen.findByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Practice Statistics')).toBeInTheDocument();
    expect(screen.getByText('Total sessions')).toBeInTheDocument();
    expect(screen.getByText('Total minutes')).toBeInTheDocument();
    expect(screen.getAllByText('45 min')).toHaveLength(3);
    expect(screen.getByText('Songs practiced')).toBeInTheDocument();
    expect(screen.getByText('Average session')).toBeInTheDocument();
    expect(screen.getByText('Latest practice')).toBeInTheDocument();
    expect(screen.getByText('Unknown artist')).toBeInTheDocument();
    expect(screen.getAllByText('2026-07-01')).toHaveLength(2);
    expect(screen.getByText('92 BPM')).toBeInTheDocument();
    expect(screen.getByText('Verse rhythm and bends')).toBeInTheDocument();
    expect(onLoadSessions).toHaveBeenCalledWith();
  });

  it('renders empty state when no practice records exist', () => {
    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('Practice Statistics')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(screen.getAllByText('0 min')).toHaveLength(2);
    expect(screen.getByText('No practice yet')).toBeInTheDocument();
    expect(screen.getByText('No practice sessions recorded yet.')).toBeInTheDocument();
  });

  it('shows an error when practice history cannot load', async () => {
    renderWithI18n(<PracticeHistoryPage onLoadSessions={vi.fn().mockRejectedValue(new Error('practice failed'))} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('practice failed');
    expect(screen.getByText('No practice sessions recorded yet.')).toBeInTheDocument();
  });

  it('saves a practice session and refreshes the loaded history', async () => {
    const user = userEvent.setup();
    const onLoadSongs = vi.fn().mockResolvedValue([
      {
        id: 'little-wing',
        title: 'Little Wing',
        artistName: 'Unknown artist',
        status: 'learning',
        difficulty: 4,
      },
    ]);
    const onSaveSession = vi.fn().mockResolvedValue(undefined);
    const onLoadSessions = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'practice-2',
          songTitle: 'Little Wing',
          artistName: 'Unknown artist',
          practicedOn: '2026-07-01',
          durationMinutes: 30,
          bpm: null,
          focusArea: 'Clean chord changes',
          reflection: 'Keep the metronome slower.',
        },
      ]);

    renderWithI18n(
      <PracticeHistoryPage
        onLoadSessions={onLoadSessions}
        onLoadSongs={onLoadSongs}
        onSaveSession={onSaveSession}
      />,
    );

    expect(await screen.findByText('No practice sessions recorded yet.')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Little Wing' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Song'), 'little-wing');
    await user.type(screen.getByLabelText('Duration minutes'), '30');
    await user.type(screen.getByLabelText('Focus area'), 'Clean chord changes');
    await user.type(screen.getByLabelText('Reflection'), 'Keep the metronome slower.');
    await user.click(screen.getByRole('button', { name: 'Save practice session' }));

    expect(onSaveSession).toHaveBeenCalledWith({
      songId: 'little-wing',
      durationMinutes: 30,
      bpm: null,
      focusArea: 'Clean chord changes',
      reflection: 'Keep the metronome slower.',
    });
    expect(onLoadSessions).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Clean chord changes')).toBeInTheDocument();
    expect(screen.getAllByText('Little Wing')).toHaveLength(2);
  });

  it('renders Chinese messages', () => {
    window.localStorage.setItem('rcokroll.locale', 'zh-CN');

    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('练习历史')).toBeInTheDocument();
    expect(screen.getByText('练习统计')).toBeInTheDocument();
    expect(screen.getByText('还没有练习记录。')).toBeInTheDocument();
  });
});
