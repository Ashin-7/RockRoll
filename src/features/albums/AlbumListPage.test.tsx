import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { AlbumListPage } from './AlbumListPage';
import { AlbumSummary } from './album.types';

const albums: AlbumSummary[] = [
  {
    id: 'album-1',
    title: 'Axis: Bold as Love',
    artistName: 'Jimi Hendrix',
    releaseYear: 1967,
    albumType: 'album',
    notes: 'Second studio album.',
  },
];

describe('AlbumListPage', () => {
  it('loads and renders albums from the provided loader', async () => {
    renderWithI18n(<AlbumListPage onLoadAlbums={vi.fn().mockResolvedValue(albums)} />);

    expect(screen.getByText('Loading albums...')).toBeInTheDocument();
    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Axis: Bold as Love' })).toHaveAttribute('href', '#album/album-1');
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByText('1967')).toBeInTheDocument();
  });

  it('renders empty state when no albums exist', async () => {
    renderWithI18n(<AlbumListPage onLoadAlbums={vi.fn().mockResolvedValue([])} />);

    expect(await screen.findByText('No albums in the archive yet.')).toBeInTheDocument();
  });

  it('creates an album and refreshes the list', async () => {
    const loadAlbums = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(albums);
    const createAlbum = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(<AlbumListPage onCreateAlbum={createAlbum} onLoadAlbums={loadAlbums} />);

    await user.type(await screen.findByLabelText('Title'), 'Axis: Bold as Love');
    await user.type(screen.getByLabelText('Release year'), '1967');
    await user.selectOptions(screen.getByLabelText('Type'), 'album');
    await user.type(screen.getByLabelText('Notes'), 'Second studio album.');
    await user.click(screen.getByRole('button', { name: 'Add album' }));

    expect(createAlbum).toHaveBeenCalledWith({
      title: 'Axis: Bold as Love',
      artistId: null,
      releaseYear: 1967,
      albumType: 'album',
      notes: 'Second studio album.',
    });
    await waitFor(() => expect(loadAlbums).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Album added.')).toBeInTheDocument();
  });
});
