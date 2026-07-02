import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { SongDetailPage } from './SongDetailPage';
import { SongDetail } from './song.types';

const song: SongDetail = {
  id: 'song-1',
  title: 'Little Wing',
  artistName: 'Unknown artist',
  status: 'learning',
  difficulty: 4,
  releaseYear: 1967,
  bpm: 92,
  notes: 'Work on phrasing.',
};

describe('SongDetailPage', () => {
  it('loads and renders a song detail', async () => {
    renderWithI18n(<SongDetailPage onLoadSong={vi.fn().mockResolvedValue(song)} songId="song-1" />);

    expect(screen.getByText('Loading song detail...')).toBeInTheDocument();
    expect(await screen.findByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Unknown artist')).toBeInTheDocument();
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText('1967')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('Work on phrasing.')).toBeInTheDocument();
  });

  it('renders not found when the song cannot be loaded', async () => {
    renderWithI18n(<SongDetailPage onLoadSong={vi.fn().mockResolvedValue(null)} songId="missing-song" />);

    expect(await screen.findByText('Song not found.')).toBeInTheDocument();
  });

  it('renders an error state when the song detail cannot load', async () => {
    renderWithI18n(<SongDetailPage onLoadSong={vi.fn().mockRejectedValue(new Error('network failed'))} songId="song-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('network failed');
  });

  it('edits a song and reloads its detail', async () => {
    const user = userEvent.setup();
    const onUpdateSong = vi.fn().mockResolvedValue(undefined);
    const onLoadSong = vi
      .fn()
      .mockResolvedValueOnce(song)
      .mockResolvedValueOnce({
        ...song,
        status: 'polishing',
        difficulty: 5,
        bpm: 96,
        notes: 'Tighten the outro.',
      });

    renderWithI18n(<SongDetailPage onLoadSong={onLoadSong} onUpdateSong={onUpdateSong} songId="song-1" />);

    expect(await screen.findByText('Little Wing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit song' }));

    expect(screen.getByLabelText('Title')).toHaveValue('Little Wing');
    expect(screen.getByLabelText('Status')).toHaveValue('learning');
    expect(screen.getByLabelText('Difficulty')).toHaveValue(4);
    expect(screen.getByLabelText('Release year')).toHaveValue(1967);
    expect(screen.getByLabelText('BPM')).toHaveValue(92);
    expect(screen.getByLabelText('Notes')).toHaveValue('Work on phrasing.');

    await user.selectOptions(screen.getByLabelText('Status'), 'polishing');
    await user.clear(screen.getByLabelText('Difficulty'));
    await user.type(screen.getByLabelText('Difficulty'), '5');
    await user.clear(screen.getByLabelText('BPM'));
    await user.type(screen.getByLabelText('BPM'), '96');
    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Tighten the outro.');
    await user.click(screen.getByRole('button', { name: 'Save song' }));

    expect(onUpdateSong).toHaveBeenCalledWith('song-1', {
      title: 'Little Wing',
      status: 'polishing',
      difficulty: 5,
      releaseYear: 1967,
      bpm: 96,
      notes: 'Tighten the outro.',
    });
    expect(onLoadSong).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Polishing')).toBeInTheDocument();
    expect(screen.getByText('Tighten the outro.')).toBeInTheDocument();
  });

  it('deletes a song after confirmation and returns to songs', async () => {
    const user = userEvent.setup();
    const onDeleteSong = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    window.location.hash = '#song/song-1';

    renderWithI18n(<SongDetailPage onDeleteSong={onDeleteSong} onLoadSong={vi.fn().mockResolvedValue(song)} songId="song-1" />);

    expect(await screen.findByText('Little Wing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete song' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this song? Practice sessions will stay in history.');
    expect(onDeleteSong).toHaveBeenCalledWith('song-1');
    expect(window.location.hash).toBe('#songs');
  });

  it('keeps a song when delete confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onDeleteSong = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderWithI18n(<SongDetailPage onDeleteSong={onDeleteSong} onLoadSong={vi.fn().mockResolvedValue(song)} songId="song-1" />);

    expect(await screen.findByText('Little Wing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete song' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this song? Practice sessions will stay in history.');
    expect(onDeleteSong).not.toHaveBeenCalled();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
  });
});
