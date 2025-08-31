import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://gsgqcsaycyjkbeepwoto.supabase.co';
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ3Fjc2F5Y3lqa2JlZXB3b3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjIwNDAsImV4cCI6MjA3MjE5ODA0MH0.2lpA4T5HEHOwymNTUI6ZuXfhcgsFzViTf5-lsWklnEE';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? FALLBACK_ANON;

// IMPORTANTISSIMO: nessun riferimento a service role nel client
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true }
});
