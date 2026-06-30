import { createClient } from '@supabase/supabase-js';
import { readEnv } from '../config/env';

const env = readEnv();

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
