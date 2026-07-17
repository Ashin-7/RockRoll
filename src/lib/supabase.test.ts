import { describe, expect, it, vi } from 'vitest';

describe('supabase client module', () => {
  it('does not require Supabase env values during module import', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();

    await expect(import('./supabase')).resolves.toHaveProperty('getSupabase');
  });
});
