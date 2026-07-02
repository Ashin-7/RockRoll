import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ArtistDetailPage } from './ArtistDetailPage';
import { ArtistDetail } from './artist.types';

const artist: ArtistDetail = {
  id: 'artist-1',
  name: 'Jimi Hendrix',
  country: 'US',
  beginYear: 1942,
  endYear: 1970,
  notes: 'Electric blues vocabulary.',
};

describe('ArtistDetailPage', () => {
  it('loads and renders an artist detail', async () => {
    renderWithI18n(<ArtistDetailPage artistId="artist-1" onLoadArtist={vi.fn().mockResolvedValue(artist)} />);

    expect(screen.getByText('Loading artist detail...')).toBeInTheDocument();
    expect(await screen.findByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('1942')).toBeInTheDocument();
    expect(screen.getByText('1970')).toBeInTheDocument();
    expect(screen.getByText('Electric blues vocabulary.')).toBeInTheDocument();
  });

  it('renders not found when the artist cannot be loaded', async () => {
    renderWithI18n(<ArtistDetailPage artistId="missing-artist" onLoadArtist={vi.fn().mockResolvedValue(null)} />);

    expect(await screen.findByText('Artist not found.')).toBeInTheDocument();
  });

  it('renders an error state when the artist detail cannot load', async () => {
    renderWithI18n(
      <ArtistDetailPage artistId="artist-1" onLoadArtist={vi.fn().mockRejectedValue(new Error('network failed'))} />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('network failed');
  });
});
