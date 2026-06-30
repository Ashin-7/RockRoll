import { createClient } from '@supabase/supabase-js';
import { readEnv } from '../config/env';

let supabaseClient: ReturnType<typeof createClient> | undefined;

export function getSupabase() {
  if (!supabaseClient) {
    const env = readEnv();
    supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }

  return supabaseClient as any;
}
