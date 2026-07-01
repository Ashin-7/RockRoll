import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { SongListPage } from './SongListPage';
import { SongSummary } from './song.types';

describe('SongListPage', () => {
  it('renders the local song practice board by default', () => {
    renderWithI18n(<SongListPage />);

    expect(screen.getByText('Current rotation')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Autumn Leaves')).toBeInTheDocument();
    expect(screen.getByText('Solo checkpoint')).toBeInTheDocument();
  });

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
    expect(screen.getByText('Learning')).toBeInTheDocument();
  });

  it('renders empty state when no songs exist', () => {
    renderWithI18n(<SongListPage songs={[]} />);

    expect(screen.getByText('No songs in the archive yet.')).toBeInTheDocument();
  });

  it('renders the local song board with Chinese messages', () => {
    window.localStorage.setItem('rcokroll.locale', 'zh-CN');

    renderWithI18n(<SongListPage />);

    expect(screen.getByText('曲目')).toBeInTheDocument();
    expect(screen.getByText('当前练习轮换')).toBeInTheDocument();
    expect(screen.getByText('学习中')).toBeInTheDocument();
  });
});
