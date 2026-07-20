import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, readEnvMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(() => ({})),
  readEnvMock: vi.fn(() => ({
    supabaseAnonKey: 'anon-key',
    supabaseUrl: 'https://example.supabase.co',
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

vi.mock('../config/env', () => ({
  readEnv: readEnvMock,
}));

describe('supabase client module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('does not require Supabase env values during module import', async () => {
    vi.unstubAllEnvs();

    await expect(import('./supabase')).resolves.toHaveProperty('getSupabase');
    expect(readEnvMock).not.toHaveBeenCalled();
  });

  it('uses PKCE so auth callbacks do not conflict with hash routing', async () => {
    const { getSupabase } = await import('./supabase');

    getSupabase();

    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      {
        auth: {
          flowType: 'pkce',
        },
      },
    );
  });
});
