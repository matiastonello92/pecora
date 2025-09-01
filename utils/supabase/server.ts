import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export function createSupabaseServerClient() {
  const cookieStore = cookies() as any;

  const get = (name: string) => cookieStore.get(name)?.value;

  const set = (name: string, value: string, options: CookieOptions) => {
    cookieStore.set({
      name,
      value,
      ...options,
    });
  };

  const remove = (name: string, options: CookieOptions) => {
    cookieStore.set({
      name,
      value: '',
      ...options,
      maxAge: 0,
    });
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, anon, {
    cookies: { get, set, remove },
  });
}

