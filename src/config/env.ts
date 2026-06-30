export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function readEnv(): AppEnv {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY');
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}
