import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { requireSupabaseEnv } from './config';

export function createSupabaseServerClient() {
  const { url, anon } = requireSupabaseEnv();
  const cookieStore = cookies() as any;

  return createServerClient(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) =>
        cookieStore.set({ name, value, ...options }),
      remove: (name: string, options: CookieOptions) =>
        cookieStore.set({ name, value: '', ...options, maxAge: 0 }),
    },
  });
}

