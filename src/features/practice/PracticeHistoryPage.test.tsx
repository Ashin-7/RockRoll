import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { PracticeHistoryPage } from './PracticeHistoryPage';

describe('PracticeHistoryPage', () => {
  const signedInSession = { user: { email: 'player@example.com' } };

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
        onGetCurrentSession={vi.fn().mockResolvedValue(signedInSession)}
        onAuthStateChange={() => vi.fn()}
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

  it('deletes a practice session after confirmation and refreshes the loaded history', async () => {
    const user = userEvent.setup();
    const onDeleteSession = vi.fn().mockResolvedValue(undefined);
    const onLoadSessions = vi
      .fn()
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithI18n(
      <PracticeHistoryPage
        onDeleteSession={onDeleteSession}
        onGetCurrentSession={vi.fn().mockResolvedValue(signedInSession)}
        onAuthStateChange={() => vi.fn()}
        onLoadSessions={onLoadSessions}
      />,
    );

    expect(await screen.findByText('Little Wing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete practice session' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this practice session?');
    expect(onDeleteSession).toHaveBeenCalledWith('practice-1');
    expect(onLoadSessions).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('No practice sessions recorded yet.')).toBeInTheDocument();
  });

  it('edits a practice session and refreshes the loaded history', async () => {
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
    const onUpdateSession = vi.fn().mockResolvedValue(undefined);
    const onLoadSessions = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'practice-1',
          songId: 'little-wing',
          songTitle: 'Little Wing',
          artistName: 'Unknown artist',
          practicedOn: '2026-07-01',
          durationMinutes: 45,
          bpm: 92,
          focusArea: 'Verse rhythm and bends',
          reflection: 'Timing is tighter than yesterday.',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'practice-1',
          songId: 'little-wing',
          songTitle: 'Little Wing',
          artistName: 'Unknown artist',
          practicedOn: '2026-07-01',
          durationMinutes: 50,
          bpm: 96,
          focusArea: 'Outro timing',
          reflection: 'Cleaner transition.',
        },
      ]);

    renderWithI18n(
      <PracticeHistoryPage
        onGetCurrentSession={vi.fn().mockResolvedValue(signedInSession)}
        onAuthStateChange={() => vi.fn()}
        onLoadSessions={onLoadSessions}
        onLoadSongs={onLoadSongs}
        onUpdateSession={onUpdateSession}
      />,
    );

    expect(await screen.findByText('Little Wing')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Little Wing' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit practice session' }));

    expect(screen.getByLabelText('Duration minutes')).toHaveValue(45);
    expect(screen.getByLabelText('BPM')).toHaveValue(92);
    expect(screen.getByLabelText('Focus area')).toHaveValue('Verse rhythm and bends');
    expect(screen.getByLabelText('Reflection')).toHaveValue('Timing is tighter than yesterday.');

    await user.clear(screen.getByLabelText('Duration minutes'));
    await user.type(screen.getByLabelText('Duration minutes'), '50');
    await user.clear(screen.getByLabelText('BPM'));
    await user.type(screen.getByLabelText('BPM'), '96');
    await user.clear(screen.getByLabelText('Focus area'));
    await user.type(screen.getByLabelText('Focus area'), 'Outro timing');
    await user.clear(screen.getByLabelText('Reflection'));
    await user.type(screen.getByLabelText('Reflection'), 'Cleaner transition.');
    await user.click(screen.getByRole('button', { name: 'Save practice session' }));

    expect(onUpdateSession).toHaveBeenCalledWith('practice-1', {
      songId: 'little-wing',
      durationMinutes: 50,
      bpm: 96,
      focusArea: 'Outro timing',
      reflection: 'Cleaner transition.',
    });
    expect(onLoadSessions).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Outro timing')).toBeInTheDocument();
  });

  it('keeps a practice session when delete confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onDeleteSession = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderWithI18n(
      <PracticeHistoryPage
        onDeleteSession={onDeleteSession}
        sessions={[
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
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete practice session' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this practice session?');
    expect(onDeleteSession).not.toHaveBeenCalled();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
  });

  it('requires sign-in before rendering the practice session form', async () => {
    const onLoadSongs = vi.fn().mockResolvedValue([]);

    renderWithI18n(
      <PracticeHistoryPage
        onGetCurrentSession={vi.fn().mockResolvedValue(null)}
        onAuthStateChange={() => vi.fn()}
        onLoadSessions={vi.fn().mockResolvedValue([])}
        onLoadSongs={onLoadSongs}
      />,
    );

    expect(await screen.findByText('Sign in to save practice sessions.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save practice session' })).not.toBeInTheDocument();
    expect(onLoadSongs).not.toHaveBeenCalled();
  });

  it('renders Chinese messages', () => {
    window.localStorage.setItem('rockroll.locale', 'zh-CN');

    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('练习历史')).toBeInTheDocument();
    expect(screen.getByText('练习统计')).toBeInTheDocument();
    expect(screen.getByText('还没有练习记录。')).toBeInTheDocument();
  });
});
