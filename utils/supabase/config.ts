const FALLBACK_URL = 'https://gsgqcsaycyjkbeepwoto.supabase.co';
const FALLBACK_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ3Fjc2F5Y3lqa2JlZXB3b3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyMjA0MCwiZXhwIjoyMDcyMTk4MDQwfQ.yLhptsYhikZvbVD1CBZ-21bDaavmB_c5pmsRZs3DSDA';
// Using service role key as fallback anon key for local/testing environments.
const FALLBACK_ANON_KEY = FALLBACK_SERVICE_ROLE_KEY;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_URL;
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  FALLBACK_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? FALLBACK_SERVICE_ROLE_KEY;
