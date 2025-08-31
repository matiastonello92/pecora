import { supabase } from '@/lib/supabase/client';
export async function hardLogout() {
  try { await supabase.auth.signOut(); } catch {}
  try {
    localStorage.clear(); sessionStorage.clear();
    if ('indexedDB' in window) { try { indexedDB.deleteDatabase('supabase-auth'); } catch {} }
  } catch {}
  window.location.href = '/login';
}
