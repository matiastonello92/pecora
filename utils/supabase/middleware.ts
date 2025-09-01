import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Tip opzionale per le options accettate da ResponseCookies.delete({ ... })
type CookieDeleteOptions = Partial<{
  path: string;
  domain: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  // maxAge e expires non sono rilevanti per delete, ma non danno fastidio se presenti
  maxAge: number;
}>;

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
        // ⬇️ conserva le options su Response.delete usando la forma a oggetto
        remove: (name: string, options?: CookieDeleteOptions) => {
          // NextRequest.delete: solo (name)
          request.cookies.delete(name);
          // NextResponse.delete: (name) | ({ name, ...options })
          if (options && Object.keys(options).length > 0) {
            response.cookies.delete({ name, ...options });
          } else {
            response.cookies.delete(name);
          }
        },
      },
    }
  );

  // Innesca eventuale refresh token/cookie
  await supabase.auth.getUser();
  return response;
}

