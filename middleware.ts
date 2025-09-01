import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next/|static/|favicon.ico|robots.txt|sitemap.xml|api/health|api/internal/setup/apply-migrations).*)'],
};

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.resend.com",
      "frame-ancestors 'self'",
    ].join('; ');
    res.headers.set('Content-Security-Policy', csp);

    return res;
  } catch {
    return NextResponse.next();
  }
}

