import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Middleware SSR:
 * - @supabase/ssr v0.5.x richiede cookies.getAll()/setAll()
 * - In setAll scriviamo SEMPRE su response.cookies (con options) e
 *   manteniamo lo stato anche su request.cookies per la stessa richiesta.
 */
export async function middleware(request: NextRequest) {
  // Passa la request a NextResponse.next per preservare body/headers stream
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Legge tutti i cookie disponibili nella richiesta corrente
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
        },

        /**
         * Imposta/cancella i cookie richiesti da Supabase.
         * - Scrive sulla response con le options (path, domain, sameSite, ecc.)
         * - Mantiene in sync anche request.cookies per questa stessa richiesta:
         *   - se "delete" (maxAge: 0 / expires passato / value === ""), usa request.cookies.delete(name)
         *   - altrimenti request.cookies.set(name, value)
         */
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value, options } of cookiesToSet) {
            // 1) Scrivi sulla response con le opzioni così come fornite da Supabase
            response.cookies.set(name, value, options);

            // 2) Mantieni la request allineata per il resto della pipeline di questa richiesta
            const isDeletion =
              value === "" ||
              options?.maxAge === 0 ||
              (options?.expires && new Date(options.expires).getTime() <= Date.now());

            if (isDeletion) {
              request.cookies.delete(name);     // Next 15: solo (name)
            } else {
              request.cookies.set(name, value); // Next 15: solo (name, value) senza options
            }
          }
        },
      },
    }
  );

  // Forza la sincronizzazione (refresh token/cookie) se necessario
  await supabase.auth.getUser();

  return response;
}

// Mantieni il matcher del progetto se diverso
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
