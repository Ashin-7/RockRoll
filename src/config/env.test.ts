import { afterEach, describe, expect, it, vi } from 'vitest';

describe('env config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns configured Supabase values', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');

    const { readEnv } = await import('./env');

    expect(readEnv()).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
    });
  });

  it('throws when Supabase URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');

    const { readEnv } = await import('./env');

    expect(() => readEnv()).toThrow('Missing VITE_SUPABASE_URL');
  });

  it('throws when Supabase anon key is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { readEnv } = await import('./env');

    expect(() => readEnv()).toThrow('Missing VITE_SUPABASE_ANON_KEY');
  });
});
