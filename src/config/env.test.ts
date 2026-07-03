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

  it('enables demo mode only with the explicit flag', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');

    const { isDemoModeEnabled } = await import('./env');

    expect(isDemoModeEnabled()).toBe(true);
  });

  it('keeps demo mode disabled by default', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', '');

    const { isDemoModeEnabled } = await import('./env');

    expect(isDemoModeEnabled()).toBe(false);
  });

  it('throws when Supabase URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');

    const { readEnv } = await import('./env');

    expect(() => readEnv()).toThrow(
      'Supabase configuration missing: VITE_SUPABASE_URL is required. Set VITE_ENABLE_DEMO_MODE=true only for local demo mode.',
    );
  });

  it('keeps legacy missing Supabase errors when demo mode is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');

    const { readEnv } = await import('./env');

    expect(() => readEnv()).toThrow('Missing VITE_SUPABASE_URL');
  });

  it('throws when Supabase anon key is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { readEnv } = await import('./env');

    expect(() => readEnv()).toThrow(
      'Supabase configuration missing: VITE_SUPABASE_ANON_KEY is required. Set VITE_ENABLE_DEMO_MODE=true only for local demo mode.',
    );
  });
});
