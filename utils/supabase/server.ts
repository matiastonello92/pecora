import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ fornisci getAll() come richiesto dal tipo CookieMethodsServer
        getAll: () =>
          cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),

        // 🚫 niente scrittura cookie qui: la fa la middleware
        set: () => {},
        remove: () => {},
      },
    }
  );
}

