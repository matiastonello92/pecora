'use client';
import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';

export function useRequireSession() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && !data.session) window.location.href = '/login';
    });
    return () => { mounted = false; };
  }, []);
}
