import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('edits an artist and reloads its detail', async () => {
    const user = userEvent.setup();
    const onUpdateArtist = vi.fn().mockResolvedValue(undefined);
    const onLoadArtist = vi
      .fn()
      .mockResolvedValueOnce(artist)
      .mockResolvedValueOnce({
        ...artist,
        name: 'Jimi Hendrix Experience',
        country: 'UK',
        beginYear: 1966,
        endYear: 1970,
        notes: 'Band context.',
      });

    renderWithI18n(
      <ArtistDetailPage artistId="artist-1" onLoadArtist={onLoadArtist} onUpdateArtist={onUpdateArtist} />,
    );

    expect(await screen.findByText('Jimi Hendrix')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit artist' }));

    expect(screen.getByLabelText('Name')).toHaveValue('Jimi Hendrix');
    expect(screen.getByLabelText('Country')).toHaveValue('US');
    expect(screen.getByLabelText('Begin year')).toHaveValue(1942);
    expect(screen.getByLabelText('End year')).toHaveValue(1970);
    expect(screen.getByLabelText('Notes')).toHaveValue('Electric blues vocabulary.');

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Jimi Hendrix Experience');
    await user.clear(screen.getByLabelText('Country'));
    await user.type(screen.getByLabelText('Country'), 'UK');
    await user.clear(screen.getByLabelText('Begin year'));
    await user.type(screen.getByLabelText('Begin year'), '1966');
    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Band context.');
    await user.click(screen.getByRole('button', { name: 'Save artist' }));

    expect(onUpdateArtist).toHaveBeenCalledWith('artist-1', {
      name: 'Jimi Hendrix Experience',
      country: 'UK',
      beginYear: 1966,
      endYear: 1970,
      notes: 'Band context.',
    });
    expect(onLoadArtist).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Jimi Hendrix Experience')).toBeInTheDocument();
    expect(screen.getByText('Band context.')).toBeInTheDocument();
  });

  it('deletes an artist after confirmation and returns to artists', async () => {
    const user = userEvent.setup();
    const onDeleteArtist = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    window.location.hash = '#artist/artist-1';

    renderWithI18n(
      <ArtistDetailPage artistId="artist-1" onDeleteArtist={onDeleteArtist} onLoadArtist={vi.fn().mockResolvedValue(artist)} />,
    );

    expect(await screen.findByText('Jimi Hendrix')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete artist' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this artist? Related songs and albums will keep their history.');
    expect(onDeleteArtist).toHaveBeenCalledWith('artist-1');
    expect(window.location.hash).toBe('#artists');
  });

  it('keeps an artist when delete confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onDeleteArtist = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderWithI18n(
      <ArtistDetailPage artistId="artist-1" onDeleteArtist={onDeleteArtist} onLoadArtist={vi.fn().mockResolvedValue(artist)} />,
    );

    expect(await screen.findByText('Jimi Hendrix')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete artist' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this artist? Related songs and albums will keep their history.');
    expect(onDeleteArtist).not.toHaveBeenCalled();
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
  });
});
