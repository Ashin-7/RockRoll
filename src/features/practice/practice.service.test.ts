import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const selectMock = vi.fn(() => ({ order: orderMock }));
const insertMock = vi.fn();
const getSessionMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock, select: selectMock }));
const getSupabaseMock = vi.fn(() => ({
  auth: { getSession: getSessionMock },
  from: fromMock,
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

describe('practice.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getSupabaseMock.mockReturnValue({
      auth: { getSession: getSessionMock },
      from: fromMock,
    });
  });

  it('lists practice history from Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'practice-1',
          song_id: 'song-1',
          practiced_on: '2026-07-01',
          duration_minutes: 45,
          bpm: 92,
          focus_area: 'Verse rhythm and bends',
          reflection: 'Timing is tighter.',
          songs: { title: 'Little Wing' },
        },
      ],
      error: null,
    });
    const { listPracticeHistory } = await import('./practice.service');

    await expect(listPracticeHistory()).resolves.toEqual([
      {
        id: 'practice-1',
        songTitle: 'Little Wing',
        artistName: 'Unknown artist',
        practicedOn: '2026-07-01',
        durationMinutes: 45,
        bpm: 92,
        focusArea: 'Verse rhythm and bends',
        reflection: 'Timing is tighter.',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('practice_sessions');
    expect(selectMock).toHaveBeenCalledWith(
      'id,song_id,practiced_on,duration_minutes,bpm,focus_area,reflection,songs(title)',
    );
    expect(orderMock).toHaveBeenCalledWith('practiced_on', { ascending: false });
  });

  it('uses a fallback song title when a practice session is not linked to a song', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'practice-1',
          song_id: null,
          practiced_on: '2026-07-01',
          duration_minutes: 20,
          bpm: null,
          focus_area: '',
          reflection: '',
          songs: null,
        },
      ],
      error: null,
    });
    const { listPracticeHistory } = await import('./practice.service');

    await expect(listPracticeHistory()).resolves.toEqual([
      expect.objectContaining({
        songTitle: 'Unknown song',
        artistName: 'Unknown artist',
      }),
    ]);
  });

  it('creates a practice session for the current user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockResolvedValue({ error: null });
    const { createPracticeSession } = await import('./practice.service');

    await createPracticeSession({
      songId: 'song-1',
      durationMinutes: 45,
      bpm: 92,
      focusArea: 'Verse rhythm and bends',
      reflection: 'Timing is tighter.',
    });

    expect(fromMock).toHaveBeenCalledWith('practice_sessions');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      song_id: 'song-1',
      duration_minutes: 45,
      bpm: 92,
      focus_area: 'Verse rhythm and bends',
      reflection: 'Timing is tighter.',
    });
  });

  it('throws when creating without a signed-in user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { createPracticeSession } = await import('./practice.service');

    await expect(
      createPracticeSession({
        songId: null,
        durationMinutes: 30,
        bpm: null,
        focusArea: '',
        reflection: '',
      }),
    ).rejects.toThrow('Sign in before saving practice sessions.');
  });

  it('stores and lists local demo practice sessions when Supabase is not configured', async () => {
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem(
      'rockroll.demoSession',
      JSON.stringify({ user: { id: 'local-demo-user', email: 'demo@rockroll.local' } }),
    );
    const { createPracticeSession, listPracticeHistory } = await import('./practice.service');

    await createPracticeSession({
      songId: null,
      durationMinutes: 28,
      bpm: 60,
      focusArea: 'Alternate picking',
      reflection: 'Keep the wrist relaxed.',
    });

    await expect(listPracticeHistory()).resolves.toEqual([
      expect.objectContaining({
        songTitle: 'Local demo practice',
        artistName: 'Local demo',
        durationMinutes: 28,
        bpm: 60,
        focusArea: 'Alternate picking',
        reflection: 'Keep the wrist relaxed.',
      }),
    ]);
  });
});
