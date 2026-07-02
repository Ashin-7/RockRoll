import { screen } from '@testing-library/react';
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
});
