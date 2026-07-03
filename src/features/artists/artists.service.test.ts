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
const fromMock = vi.fn(() => ({ delete: deleteMock, select: selectMock, insert: insertMock, update: updateMock }));
const getSupabaseMock = vi.fn(() => ({
  auth: { getSession: getSessionMock },
  from: fromMock,
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

describe('artists.service', () => {
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

  it('lists artists from Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'artist-1',
          name: 'Jimi Hendrix',
          country: 'US',
          begin_year: 1942,
          end_year: 1970,
          notes: 'Electric blues vocabulary.',
        },
      ],
      error: null,
    });
    const { listArtists } = await import('./artists.service');

    await expect(listArtists()).resolves.toEqual([
      {
        id: 'artist-1',
        name: 'Jimi Hendrix',
        country: 'US',
        beginYear: 1942,
        endYear: 1970,
        notes: 'Electric blues vocabulary.',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('artists');
    expect(selectMock).toHaveBeenCalledWith('id,name,country,begin_year,end_year,notes');
    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('loads an artist detail from Supabase', async () => {
    selectMock.mockReturnValue({ eq: eqMock });
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'artist-1',
        name: 'Jimi Hendrix',
        country: 'US',
        begin_year: 1942,
        end_year: 1970,
        notes: 'Electric blues vocabulary.',
      },
      error: null,
    });
    const { getArtistById } = await import('./artists.service');

    await expect(getArtistById('artist-1')).resolves.toEqual({
      id: 'artist-1',
      name: 'Jimi Hendrix',
      country: 'US',
      beginYear: 1942,
      endYear: 1970,
      notes: 'Electric blues vocabulary.',
    });
    expect(fromMock).toHaveBeenCalledWith('artists');
    expect(selectMock).toHaveBeenCalledWith('id,name,country,begin_year,end_year,notes');
    expect(eqMock).toHaveBeenCalledWith('id', 'artist-1');
    expect(maybeSingleMock).toHaveBeenCalledWith();
  });

  it('creates an artist for the current user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockResolvedValue({ error: null });
    const { createArtist } = await import('./artists.service');

    await createArtist({ name: 'New Artist', country: 'US', beginYear: 1999, notes: 'Practice references.' });

    expect(fromMock).toHaveBeenCalledWith('artists');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'New Artist',
      country: 'US',
      begin_year: 1999,
      notes: 'Practice references.',
    });
  });

  it('throws when creating without a signed-in user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { createArtist } = await import('./artists.service');

    await expect(createArtist({ name: 'New Artist', country: null, beginYear: null, notes: '' })).rejects.toThrow(
      'Sign in before adding artists.',
    );
  });

  it('updates an artist in Supabase', async () => {
    updateEqMock.mockResolvedValue({ error: null });
    const { updateArtist } = await import('./artists.service');

    await updateArtist('artist-1', {
      name: 'Jimi Hendrix Experience',
      country: 'US',
      beginYear: 1966,
      endYear: 1970,
      notes: 'Band context.',
    });

    expect(fromMock).toHaveBeenCalledWith('artists');
    expect(updateMock).toHaveBeenCalledWith({
      name: 'Jimi Hendrix Experience',
      country: 'US',
      begin_year: 1966,
      end_year: 1970,
      notes: 'Band context.',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'artist-1');
  });

  it('deletes an artist in Supabase', async () => {
    deleteEqMock.mockResolvedValue({ error: null });
    const { deleteArtist } = await import('./artists.service');

    await deleteArtist('artist-1');

    expect(fromMock).toHaveBeenCalledWith('artists');
    expect(deleteMock).toHaveBeenCalledWith();
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'artist-1');
  });

  it('uses local demo artists when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem(
      'rockroll.demoSession',
      JSON.stringify({ user: { id: 'local-demo-user', email: 'demo@rockroll.local' } }),
    );
    const { createArtist, listArtists } = await import('./artists.service');

    await expect(listArtists()).resolves.toEqual([]);

    await createArtist({ name: 'Demo Artist', country: 'JP', beginYear: 1980, notes: 'Local reference.' });

    await expect(listArtists()).resolves.toEqual([
      expect.objectContaining({
        id: expect.any(String),
        name: 'Demo Artist',
        country: 'JP',
        beginYear: 1980,
        notes: 'Local reference.',
      }),
    ]);
  });

  it('loads local demo artist details when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem(
      'rockroll.demoArtists',
      JSON.stringify([
        {
          id: 'local-artist-1',
          name: 'Demo Artist',
          country: 'JP',
          beginYear: 1980,
          endYear: null,
          notes: 'Local reference.',
        },
      ]),
    );
    const { getArtistById } = await import('./artists.service');

    await expect(getArtistById('local-artist-1')).resolves.toEqual({
      id: 'local-artist-1',
      name: 'Demo Artist',
      country: 'JP',
      beginYear: 1980,
      endYear: null,
      notes: 'Local reference.',
    });
  });

  it('updates local demo artists when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    window.localStorage.setItem(
      'rockroll.demoArtists',
      JSON.stringify([
        {
          id: 'local-artist-1',
          name: 'Demo Artist',
          country: 'JP',
          beginYear: 1980,
          endYear: null,
          notes: 'Local reference.',
        },
      ]),
    );
    const { getArtistById, updateArtist } = await import('./artists.service');

    await updateArtist('local-artist-1', {
      name: 'Updated Demo Artist',
      country: 'US',
      beginYear: 1970,
      endYear: 2020,
      notes: 'Updated local reference.',
    });

    await expect(getArtistById('local-artist-1')).resolves.toEqual({
      id: 'local-artist-1',
      name: 'Updated Demo Artist',
      country: 'US',
      beginYear: 1970,
      endYear: 2020,
      notes: 'Updated local reference.',
    });
  });

  it('deletes local demo artists when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    window.localStorage.setItem(
      'rockroll.demoArtists',
      JSON.stringify([
        {
          id: 'local-artist-1',
          name: 'Demo Artist',
          country: 'JP',
          beginYear: 1980,
          endYear: null,
          notes: 'Local reference.',
        },
      ]),
    );
    const { deleteArtist, listArtists } = await import('./artists.service');

    await deleteArtist('local-artist-1');

    await expect(listArtists()).resolves.toEqual([]);
  });
});
