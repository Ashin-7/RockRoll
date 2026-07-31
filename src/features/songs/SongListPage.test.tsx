import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { SongListPage } from './SongListPage';
import { SongSummary } from './song.types';

const realSongs: SongSummary[] = [
  {
    id: 'song-1',
    title: 'Little Wing',
    artistName: 'Unknown artist',
    status: 'learning',
    difficulty: 4,
  },
];

describe('SongListPage', () => {
  it('loads and renders songs from the provided loader', async () => {
    renderWithI18n(<SongListPage onLoadSongs={vi.fn().mockResolvedValue(realSongs)} />);

    expect(screen.getByText('Loading songs...')).toBeInTheDocument();
    expect(await screen.findByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Little Wing' })).toHaveAttribute('href', '#song/song-1');
    expect(screen.getByText('Unknown artist')).toBeInTheDocument();
    expect(screen.getAllByText('Learning')).toHaveLength(2);
  });

  it('renders the song board with the shared card panel', () => {
    renderWithI18n(<SongListPage songs={realSongs} />);

    expect(screen.getByRole('list', { name: 'Songs' })).toHaveClass('song-board', 'ui-panel', 'ui-panel--card');
  });

  it('renders the song hero title with the shared section heading', () => {
    renderWithI18n(<SongListPage songs={realSongs} />);

    expect(screen.getByRole('heading', { name: 'Songs', level: 1 }).closest('.ui-section-heading')).toHaveClass(
      'songs-hero__heading',
    );
  });

  it('renders the add-song title with the shared section heading', () => {
    renderWithI18n(<SongListPage songs={realSongs} />);

    expect(screen.getByRole('heading', { name: 'Add song', level: 2 }).closest('.ui-section-heading')).toHaveClass(
      'songs-add-form__heading',
    );
  });

  it('renders empty state when no real songs exist', async () => {
    renderWithI18n(<SongListPage onLoadSongs={vi.fn().mockResolvedValue([])} />);

    expect(await screen.findByText('No songs in the archive yet.')).toBeInTheDocument();
  });

  it('renders an error state when songs cannot load', async () => {
    renderWithI18n(<SongListPage onLoadSongs={vi.fn().mockRejectedValue(new Error('network failed'))} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('network failed');
  });

  it('creates a song and refreshes the list', async () => {
    const loadSongs = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(realSongs);
    const createSong = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(<SongListPage onCreateSong={createSong} onLoadSongs={loadSongs} />);

    await user.type(await screen.findByLabelText('Title'), 'Little Wing');
    await user.selectOptions(screen.getByLabelText('Status'), 'learning');
    await user.selectOptions(screen.getByLabelText('Difficulty'), '4');
    await user.click(screen.getByRole('button', { name: 'Add song' }));

    expect(createSong).toHaveBeenCalledWith({ title: 'Little Wing', status: 'learning', difficulty: 4 });
    await waitFor(() => expect(loadSongs).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Song added.')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
  });

  it('renders Chinese add-song messages', () => {
    window.localStorage.setItem('rockroll.locale', 'zh-CN');

    renderWithI18n(<SongListPage songs={[]} />);

    expect(screen.getByRole('heading', { name: '新增曲目' })).toBeInTheDocument();
    expect(screen.getByLabelText('标题')).toBeInTheDocument();
  });
});
