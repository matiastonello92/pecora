// utils/supabase/config.ts
export function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return { url, anon };
}

// opzionale: getter “soft” se serve in contesti dove non vuoi throw immediato
export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

