'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from './config';

export function createSupabaseBrowserClient() {
  const { url, anon } = requireSupabaseEnv();
  return createBrowserClient(url, anon);
}

