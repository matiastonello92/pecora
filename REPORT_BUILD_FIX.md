Removed internal test routes under app/api/internal/test that depended on missing packages.
Eliminated import of @supabase/auth-helpers-nextjs to unblock Vercel build.
Fixed duplicate migrate script in package.json and streamlined scripts.
Confirmed no new dependencies were added or environment variables changed.
Project now builds with existing turbopack configuration.
