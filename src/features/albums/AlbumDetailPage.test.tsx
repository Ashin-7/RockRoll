import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { AlbumDetailPage } from './AlbumDetailPage';
import { AlbumDetail } from './album.types';

const album: AlbumDetail = {
  id: 'album-1',
  title: 'Axis: Bold as Love',
  artistName: 'Jimi Hendrix',
  releaseYear: 1967,
  albumType: 'album',
  notes: 'Second studio album.',
};

describe('AlbumDetailPage', () => {
  it('loads and renders an album detail in the dossier pattern', async () => {
    const { container } = renderWithI18n(
      <AlbumDetailPage albumId="album-1" onLoadAlbum={vi.fn().mockResolvedValue(album)} />,
    );

    expect(screen.getByText('Loading album detail...')).toBeInTheDocument();
    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();
    expect(container.querySelector('header.album-detail-hero.ui-panel--hero')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Axis: Bold as Love' })).toBeInTheDocument();
    expect(screen.getAllByText('Jimi Hendrix').length).toBeGreaterThan(0);
    expect(screen.getByText('1967')).toBeInTheDocument();
    expect(screen.getByText('Second studio album.')).toBeInTheDocument();
    expect(screen.getByText('Album type')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Archive notes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Related' })).toBeInTheDocument();
    expect(screen.getByText('Songs, media links, archive collections, and artist relationships will collect here as the MVP grows.')).toBeInTheDocument();
  });

  it('hides album write actions for non-admin users', async () => {
    renderWithI18n(<AlbumDetailPage albumId="album-1" onLoadAlbum={vi.fn().mockResolvedValue(album)} />);

    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit album' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete album' })).not.toBeInTheDocument();
  });

  it('edits an album and reloads its detail', async () => {
    const user = userEvent.setup();
    const onUpdateAlbum = vi.fn().mockResolvedValue(undefined);
    const onLoadAlbum = vi.fn().mockResolvedValueOnce(album).mockResolvedValueOnce({
      ...album,
      title: 'Electric Ladyland',
      releaseYear: 1968,
      albumType: 'live',
      notes: 'Updated notes.',
    });

    renderWithI18n(
      <AlbumDetailPage
        albumId="album-1"
        onLoadAlbum={onLoadAlbum}
        onLoadImportRole={async () => 'admin'}
        onUpdateAlbum={onUpdateAlbum}
      />,
    );

    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit album' }));

    expect(screen.getByText('Album / edit')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Identity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Release profile' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Archive notes' }).length).toBeGreaterThan(0);

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Electric Ladyland');
    await user.clear(screen.getByLabelText('Release year'));
    await user.type(screen.getByLabelText('Release year'), '1968');
    await user.selectOptions(screen.getByLabelText('Type'), 'live');
    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Updated notes.');
    await user.click(screen.getByRole('button', { name: 'Save album' }));

    expect(onUpdateAlbum).toHaveBeenCalledWith('album-1', {
      title: 'Electric Ladyland',
      artistId: null,
      releaseYear: 1968,
      albumType: 'live',
      notes: 'Updated notes.',
    });
    expect(onLoadAlbum).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Electric Ladyland')).toBeInTheDocument();
  });

  it('deletes an album after confirmation and returns to albums', async () => {
    const user = userEvent.setup();
    const onDeleteAlbum = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    window.location.hash = '#album/album-1';

    renderWithI18n(
      <AlbumDetailPage
        albumId="album-1"
        onDeleteAlbum={onDeleteAlbum}
        onLoadAlbum={vi.fn().mockResolvedValue(album)}
        onLoadImportRole={async () => 'admin'}
      />,
    );

    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete album' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this album? Related songs will keep their history.');
    expect(onDeleteAlbum).toHaveBeenCalledWith('album-1');
    expect(window.location.hash).toBe('#albums');
  });
});
