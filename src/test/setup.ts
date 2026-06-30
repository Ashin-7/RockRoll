import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');

afterEach(() => {
  window.localStorage.clear();
});
