import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from '@/utils/supabase/config';

function initAdminClient(): SupabaseClient {
  const { url } = requireSupabaseEnv();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) {
    throw new Error('Supabase env missing: set SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAdminClient() {
  return initAdminClient();
}

let cached: SupabaseClient | null = null;
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!cached) cached = initAdminClient();
    // @ts-ignore
    return cached[prop];
  },
});

