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
          // response può ricevere options; request NO (solo name, value)
          response.cookies.set(name, value, options);
          request.cookies.set(name, value);
        },
        remove: (name: string, options?: any) => {
          // request.delete: solo (name)
          request.cookies.delete(name);
          // response.delete: (name, options?) — le options sono opzionali
          response.cookies.delete(name, options);
        },
      },
    }
  );

  // Forza refresh token/cookie se necessario
  await supabase.auth.getUser();

  return response;
}
