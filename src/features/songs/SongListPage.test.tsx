import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { SongListPage } from './SongListPage';
import { SongSummary } from './song.types';

describe('SongListPage', () => {
  it('renders songs and empty state', () => {
    const songs: SongSummary[] = [
      {
        id: 'song-1',
        title: 'Little Wing',
        artistName: 'Jimi Hendrix',
        status: 'learning',
        difficulty: 4,
      },
    ];

    renderWithI18n(<SongListPage songs={songs} />);

    expect(screen.getByText('Songs')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByText('learning')).toBeInTheDocument();
  });

  it('renders empty state when no songs exist', () => {
    renderWithI18n(<SongListPage songs={[]} />);

    expect(screen.getByText('No songs in the archive yet.')).toBeInTheDocument();
  });
});
