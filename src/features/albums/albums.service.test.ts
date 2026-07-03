import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const updateEqMock = vi.fn();
const deleteEqMock = vi.fn();
const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
const getSessionMock = vi.fn();
const fromMock = vi.fn(() => ({ delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock }));
const getSupabaseMock = vi.fn(() => ({
  auth: { getSession: getSessionMock },
  from: fromMock,
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

describe('albums.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    window.localStorage.clear();
    selectMock.mockImplementation(() => ({ order: orderMock }));
    eqMock.mockImplementation(() => ({ maybeSingle: maybeSingleMock }));
    getSupabaseMock.mockReturnValue({
      auth: { getSession: getSessionMock },
      from: fromMock,
    });
  });

  it('lists albums from Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'album-1',
          title: 'Axis: Bold as Love',
          release_year: 1967,
          album_type: 'album',
          notes: 'Second studio album.',
          artists: { name: 'Jimi Hendrix' },
        },
      ],
      error: null,
    });
    const { listAlbums } = await import('./albums.service');

    await expect(listAlbums()).resolves.toEqual([
      {
        id: 'album-1',
        title: 'Axis: Bold as Love',
        artistName: 'Jimi Hendrix',
        releaseYear: 1967,
        albumType: 'album',
        notes: 'Second studio album.',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(selectMock).toHaveBeenCalledWith('id,title,release_year,album_type,notes,artists(name)');
    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('loads an album detail from Supabase', async () => {
    selectMock.mockReturnValue({ eq: eqMock });
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'album-1',
        title: 'Axis: Bold as Love',
        release_year: 1967,
        album_type: 'album',
        notes: 'Second studio album.',
        artists: { name: 'Jimi Hendrix' },
      },
      error: null,
    });
    const { getAlbumById } = await import('./albums.service');

    await expect(getAlbumById('album-1')).resolves.toEqual({
      id: 'album-1',
      title: 'Axis: Bold as Love',
      artistName: 'Jimi Hendrix',
      releaseYear: 1967,
      albumType: 'album',
      notes: 'Second studio album.',
    });
    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(selectMock).toHaveBeenCalledWith('id,title,release_year,album_type,notes,artists(name)');
    expect(eqMock).toHaveBeenCalledWith('id', 'album-1');
    expect(maybeSingleMock).toHaveBeenCalledWith();
  });

  it('creates an album for the current user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockResolvedValue({ error: null });
    const { createAlbum } = await import('./albums.service');

    await createAlbum({
      title: 'New Album',
      artistId: 'artist-1',
      releaseYear: 2026,
      albumType: 'album',
      notes: 'Practice references.',
    });

    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      artist_id: 'artist-1',
      title: 'New Album',
      release_year: 2026,
      album_type: 'album',
      notes: 'Practice references.',
    });
  });

  it('updates an album in Supabase', async () => {
    updateEqMock.mockResolvedValue({ error: null });
    const { updateAlbum } = await import('./albums.service');

    await updateAlbum('album-1', {
      title: 'Updated Album',
      artistId: null,
      releaseYear: 1968,
      albumType: 'live',
      notes: 'Live notes.',
    });

    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(updateMock).toHaveBeenCalledWith({
      artist_id: null,
      title: 'Updated Album',
      release_year: 1968,
      album_type: 'live',
      notes: 'Live notes.',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'album-1');
  });

  it('deletes an album in Supabase', async () => {
    deleteEqMock.mockResolvedValue({ error: null });
    const { deleteAlbum } = await import('./albums.service');

    await deleteAlbum('album-1');

    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(deleteMock).toHaveBeenCalledWith();
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'album-1');
  });

  it('uses local demo albums when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    const { createAlbum, listAlbums } = await import('./albums.service');

    await expect(listAlbums()).resolves.toEqual([]);

    await createAlbum({
      title: 'Demo Album',
      artistId: null,
      releaseYear: 1980,
      albumType: 'ep',
      notes: 'Local reference.',
    });

    await expect(listAlbums()).resolves.toEqual([
      expect.objectContaining({
        id: expect.any(String),
        title: 'Demo Album',
        artistName: 'Unknown artist',
        releaseYear: 1980,
        albumType: 'ep',
        notes: 'Local reference.',
      }),
    ]);
  });

  it('updates and deletes local demo albums when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    window.localStorage.setItem(
      'rockroll.demoAlbums',
      JSON.stringify([
        {
          id: 'local-album-1',
          title: 'Demo Album',
          artistName: 'Unknown artist',
          releaseYear: 1980,
          albumType: 'album',
          notes: 'Local reference.',
        },
      ]),
    );
    const { deleteAlbum, getAlbumById, listAlbums, updateAlbum } = await import('./albums.service');

    await updateAlbum('local-album-1', {
      title: 'Updated Demo Album',
      artistId: null,
      releaseYear: 1981,
      albumType: 'compilation',
      notes: 'Updated local reference.',
    });

    await expect(getAlbumById('local-album-1')).resolves.toEqual(
      expect.objectContaining({
        title: 'Updated Demo Album',
        releaseYear: 1981,
        albumType: 'compilation',
        notes: 'Updated local reference.',
      }),
    );

    await deleteAlbum('local-album-1');

    await expect(listAlbums()).resolves.toEqual([]);
  });
});
