import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Tip larghe per le options di set/delete (compatibili con CookieSerializeOptions)
type CookieOpts = Partial<{
  path: string;
  domain: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: boolean | "lax" | "strict" | "none";
  maxAge: number;
}>;

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ CookieMethodsServer vuole getAll()
        getAll: () =>
          request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),

        // ✅ request.set(name, value) (no options) • response.set(name, value, options?)
        set: (name: string, value: string, options?: CookieOpts) => {
          response.cookies.set(name, value, options);
          request.cookies.set(name, value);
        },

        // ✅ request.delete(name) • response.delete({ name, ...options? })
        remove: (name: string, options?: CookieOpts) => {
          request.cookies.delete(name);
          if (options && Object.keys(options).length > 0) {
            response.cookies.delete({ name, ...options });
          } else {
            response.cookies.delete(name);
          }
        },
      },
    }
  );

  // Innesca refresh session/cookie se necessario
  await supabase.auth.getUser();

  return response;
}

