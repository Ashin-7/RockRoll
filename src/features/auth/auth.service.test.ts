import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseMock = vi.fn();
const queryBuilderMock = {
  delete: vi.fn(),
  eq: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
};
const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.unstubAllEnvs();
    queryBuilderMock.delete.mockReturnValue(queryBuilderMock);
    queryBuilderMock.eq.mockReturnValue(queryBuilderMock);
    queryBuilderMock.insert.mockReturnValue(queryBuilderMock);
    queryBuilderMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    queryBuilderMock.select.mockReturnValue(queryBuilderMock);
    queryBuilderMock.single.mockResolvedValue({
      data: { id: 'practice-1', user_id: 'user-1', focus_area: 'selected' },
      error: null,
    });
    queryBuilderMock.update.mockReturnValue(queryBuilderMock);
    getSupabaseMock.mockReturnValue({
      auth: authMock,
      from: vi.fn(() => queryBuilderMock),
    });
  });

  it('returns the current session', async () => {
    const session = { user: { email: 'player@example.com' } };
    authMock.getSession.mockResolvedValue({ data: { session }, error: null });
    const { getCurrentSession } = await import('./auth.service');

    await expect(getCurrentSession()).resolves.toEqual(session);
  });

  it('throws when reading the current session fails', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'session failed' } });
    const { getCurrentSession } = await import('./auth.service');

    await expect(getCurrentSession()).rejects.toThrow('session failed');
  });

  it('signs in anonymously through Supabase auth', async () => {
    authMock.signInAnonymously.mockResolvedValue({ error: null });
    const { signInAnonymously } = await import('./auth.service');

    await expect(signInAnonymously()).resolves.toBeUndefined();
    expect(authMock.signInAnonymously).toHaveBeenCalledWith();
  });

  it('signs up with email and password through Supabase auth', async () => {
    authMock.signUp.mockResolvedValue({ error: null });
    const { signUpWithPassword } = await import('./auth.service');

    await expect(signUpWithPassword('player@example.com', 'secret123')).resolves.toBeUndefined();
    expect(authMock.signUp).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'secret123',
    });
  });

  it('throws when password sign up fails', async () => {
    authMock.signUp.mockResolvedValue({ error: { message: 'User already registered' } });
    const { signUpWithPassword } = await import('./auth.service');

    await expect(signUpWithPassword('player@example.com', 'secret123')).rejects.toThrow('User already registered');
  });

  it('signs in with email and password through Supabase auth', async () => {
    authMock.signInWithPassword.mockResolvedValue({ error: null });
    const { signInWithPassword } = await import('./auth.service');

    await expect(signInWithPassword('player@example.com', 'secret123')).resolves.toBeUndefined();
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'secret123',
    });
  });

  it('throws when password sign in fails', async () => {
    authMock.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const { signInWithPassword } = await import('./auth.service');

    await expect(signInWithPassword('player@example.com', 'secret123')).rejects.toThrow(
      'Invalid login credentials',
    );
  });

  it('does not start a local demo session when Supabase is not configured without the demo flag', async () => {
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    const { getCurrentSession, signInAnonymously } = await import('./auth.service');

    await expect(signInAnonymously()).rejects.toThrow(
      'Missing VITE_SUPABASE_URL. Configure Supabase or set VITE_ENABLE_DEMO_MODE=true for local demo mode.',
    );
    await expect(getCurrentSession()).rejects.toThrow(
      'Missing VITE_SUPABASE_URL. Configure Supabase or set VITE_ENABLE_DEMO_MODE=true for local demo mode.',
    );
    expect(window.localStorage.getItem('rockroll.demoSession')).toBeNull();
  });

  it('starts a local demo session only when demo mode is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    const { getCurrentSession, signInAnonymously } = await import('./auth.service');

    await expect(signInAnonymously()).resolves.toBeUndefined();
    await expect(getCurrentSession()).resolves.toEqual({
      isDemo: true,
      user: {
        email: 'demo@rockroll.local',
        id: 'local-demo-user',
      },
    });
  });

  it('throws when anonymous sign in fails', async () => {
    authMock.signInAnonymously.mockResolvedValue({ error: { message: 'anonymous disabled' } });
    const { signInAnonymously } = await import('./auth.service');

    await expect(signInAnonymously()).rejects.toThrow('anonymous disabled');
  });

  it('signs out through Supabase auth', async () => {
    authMock.signOut.mockResolvedValue({ error: null });
    const { signOut } = await import('./auth.service');

    await expect(signOut()).resolves.toBeUndefined();
    expect(authMock.signOut).toHaveBeenCalledWith();
  });

  it('clears the local demo session on sign out', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    const { getCurrentSession, signInAnonymously, signOut } = await import('./auth.service');

    await signInAnonymously();
    await signOut();

    await expect(getCurrentSession()).resolves.toBeNull();
  });

  it('throws when sign out fails', async () => {
    authMock.signOut.mockResolvedValue({ error: { message: 'sign out failed' } });
    const { signOut } = await import('./auth.service');

    await expect(signOut()).rejects.toThrow('sign out failed');
  });

  it('subscribes to auth state changes and returns an unsubscribe function', async () => {
    const unsubscribe = vi.fn();
    const callback = vi.fn();
    const session = { user: { email: 'player@example.com' } };
    authMock.onAuthStateChange.mockImplementation((handler) => {
      handler('SIGNED_IN', session);
      return { data: { subscription: { unsubscribe } } };
    });
    const { onAuthStateChange } = await import('./auth.service');

    const stopListening = onAuthStateChange(callback);

    expect(callback).toHaveBeenCalledWith(session);
    stopListening();
    expect(unsubscribe).toHaveBeenCalledWith();
  });

  it('rejects the Supabase CRUD smoke test without a real user id', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { runSupabaseCrudSmokeTest } = await import('./auth.service');

    await expect(runSupabaseCrudSmokeTest()).rejects.toThrow(
      'A real Supabase session is required before running the CRUD smoke test.',
    );
    expect(queryBuilderMock.insert).not.toHaveBeenCalled();
  });

  it('rejects the Supabase CRUD smoke test for local demo users', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: { user: { id: 'local-demo-user' } } }, error: null });
    const { runSupabaseCrudSmokeTest } = await import('./auth.service');

    await expect(runSupabaseCrudSmokeTest()).rejects.toThrow(
      'A real Supabase session is required before running the CRUD smoke test.',
    );
    expect(queryBuilderMock.insert).not.toHaveBeenCalled();
  });

  it('runs insert select update and delete in the Supabase CRUD smoke test', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    queryBuilderMock.single
      .mockResolvedValueOnce({
        data: { id: 'practice-1', user_id: 'user-1', focus_area: 'supabase-smoke-insert' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'practice-1', user_id: 'user-1', focus_area: 'supabase-smoke-insert' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'practice-1', user_id: 'user-1', focus_area: 'supabase-smoke-update' },
        error: null,
      });
    const { runSupabaseCrudSmokeTest } = await import('./auth.service');

    await expect(runSupabaseCrudSmokeTest()).resolves.toEqual({
      deleted: true,
      insertedId: 'practice-1',
      selectedUserId: 'user-1',
      updatedFocusArea: 'supabase-smoke-update',
      userId: 'user-1',
    });
    expect(queryBuilderMock.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1' }));
    expect(queryBuilderMock.update).toHaveBeenCalledWith({ focus_area: 'supabase-smoke-update' });
    expect(queryBuilderMock.delete).toHaveBeenCalled();
  });
});
