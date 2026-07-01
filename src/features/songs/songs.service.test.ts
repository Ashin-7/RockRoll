import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const selectMock = vi.fn(() => ({ order: orderMock }));
const insertMock = vi.fn();
const getSessionMock = vi.fn();
const fromMock = vi.fn(() => ({ select: selectMock, insert: insertMock }));
const getSupabaseMock = vi.fn(() => ({
  auth: { getSession: getSessionMock },
  from: fromMock,
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

describe('songs.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getSupabaseMock.mockReturnValue({
      auth: { getSession: getSessionMock },
      from: fromMock,
    });
  });

  it('lists songs from Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'song-1', title: 'Little Wing', status: 'learning', difficulty: 4 }],
      error: null,
    });
    const { listSongs } = await import('./songs.service');

    await expect(listSongs()).resolves.toEqual([
      { id: 'song-1', title: 'Little Wing', artistName: 'Unknown artist', status: 'learning', difficulty: 4 },
    ]);
    expect(fromMock).toHaveBeenCalledWith('songs');
    expect(selectMock).toHaveBeenCalledWith('id,title,status,difficulty');
    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('falls back to planned for unknown song status', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'song-1', title: 'Untyped Song', status: 'unexpected', difficulty: null }],
      error: null,
    });
    const { listSongs } = await import('./songs.service');

    await expect(listSongs()).resolves.toEqual([
      { id: 'song-1', title: 'Untyped Song', artistName: 'Unknown artist', status: 'planned', difficulty: null },
    ]);
  });

  it('creates a song for the current user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockResolvedValue({ error: null });
    const { createSong } = await import('./songs.service');

    await createSong({ title: 'New Song', status: 'planned', difficulty: 3 });

    expect(fromMock).toHaveBeenCalledWith('songs');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: 'New Song',
      status: 'planned',
      difficulty: 3,
    });
  });

  it('writes null difficulty when difficulty is empty', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockResolvedValue({ error: null });
    const { createSong } = await import('./songs.service');

    await createSong({ title: 'New Song', status: 'learning', difficulty: null });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ difficulty: null }));
  });

  it('throws when creating without a signed-in user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { createSong } = await import('./songs.service');

    await expect(createSong({ title: 'New Song', status: 'planned', difficulty: null })).rejects.toThrow(
      'Sign in before adding songs.',
    );
  });

  it('uses local demo songs when Supabase is not configured', async () => {
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem(
      'rcokroll.demoSession',
      JSON.stringify({ user: { id: 'local-demo-user', email: 'demo@rcokroll.local' } }),
    );
    const { createSong, listSongs } = await import('./songs.service');

    await expect(listSongs()).resolves.toEqual([]);

    await createSong({ title: 'Demo Song', status: 'learning', difficulty: 2 });

    await expect(listSongs()).resolves.toEqual([
      expect.objectContaining({
        title: 'Demo Song',
        artistName: 'Local demo',
        status: 'learning',
        difficulty: 2,
      }),
    ]);
  });
});
