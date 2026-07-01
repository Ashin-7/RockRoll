import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: authMock,
  }),
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
