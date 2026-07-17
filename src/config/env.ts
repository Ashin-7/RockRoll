export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function isDemoModeEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
}

export function getMissingSupabaseEnvMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Missing Supabase configuration';
  return `${message}. Configure Supabase or set VITE_ENABLE_DEMO_MODE=true for local demo mode.`;
}

export function readEnv(): AppEnv {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const shouldAllowDemoFallback = isDemoModeEnabled();

  if (!supabaseUrl) {
    throw new Error(
      shouldAllowDemoFallback
        ? 'Missing VITE_SUPABASE_URL'
        : 'Supabase configuration missing: VITE_SUPABASE_URL is required. Set VITE_ENABLE_DEMO_MODE=true only for local demo mode.',
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      shouldAllowDemoFallback
        ? 'Missing VITE_SUPABASE_ANON_KEY'
        : 'Supabase configuration missing: VITE_SUPABASE_ANON_KEY is required. Set VITE_ENABLE_DEMO_MODE=true only for local demo mode.',
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}
