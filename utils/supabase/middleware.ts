import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          // aggiorna sia la request (per i Server Components) sia la response (per il browser)
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          request.cookies.delete({ name, ...options });
          response.cookies.delete({ name, ...options });
        },
      },
    }
  );

  // 1) Forza un getUser() per rinfrescare il token se scaduto
  await supabase.auth.getUser();

  return response;
}
