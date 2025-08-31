'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
export function useRequireSession() {
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && !data.session) window.location.href = '/login';
    });
    return () => { mounted = false; };
  }, []);
}
