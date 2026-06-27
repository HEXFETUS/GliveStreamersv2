import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

const supabaseURL = config.supabase.url || 'http://localhost:54321';
const supabaseServiceKey = config.supabase.serviceRoleKey || 'missing-supabase-service-role-key';

export const supabase = createClient(
  supabaseURL,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export const supabaseAnon = createClient(
  supabaseURL,
  config.supabase.anonKey || 'missing-supabase-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
