import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options?: any) => {
          // aggiorna SIA la response (browser) SIA la request (Server Components)
          response.cookies.set(name, value, options);
          request.cookies.set(name, value, options);
        },
        remove: (name: string, options?: any) => {
          // NextRequest.delete accetta solo (name)
          request.cookies.delete(name);
          // NextResponse.delete accetta (name, options?)
          response.cookies.delete(name, options);
        },
      },
    }
  );

  // forza un getUser() per gestire il refresh token/cookie
  await supabase.auth.getUser();

  return response;
}
