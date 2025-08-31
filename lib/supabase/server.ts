import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://gsgqcsaycyjkbeepwoto.supabase.co';
const FALLBACK_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ3Fjc2F5Y3lqa2JlZXB3b3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyMjA0MCwiZXhwIjoyMDcyMTk4MDQwfQ.yLhptsYhikZvbVD1CBZ-21bDaavmB_c5pmsRZs3DSDA';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? FALLBACK_SERVICE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
