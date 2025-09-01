import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Server Components/Route Handlers non possono scrivere cookie: li aggiorna la middleware.
export async function createClient() {
  const cookieStore = cookies();
  const headerList = headers();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // no-op: la scrittura la fa la middleware
        set() {},
        remove() {},
      },
      headers: {
        // opzionale, utile per edge revalidate
        get(name: string) {
          return headerList.get(name) ?? undefined;
        }
      }
    }
  );
}
