import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Client server-side per RSC/route handlers:
 * - getAll fornisce i cookie correnti
 * - setAll è no-op (la scrittura effettiva la fa la middleware)
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        setAll(_cookies: { name: string; value: string; options?: CookieOptions }[]) {
          // no-op in RSC/route handlers: la scrittura è demandata alla middleware
        },
      },
    }
  );
}
