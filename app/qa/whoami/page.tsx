'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';

export default function WhoAmI() {
  const [state, setState] = useState<Record<string, unknown>>({});
  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: session } = await supabase.auth.getSession();
      const { data: locs, error: lerr } = await supabase.from('locations').select('id,name,org_id').limit(5);
      setState({ user, hasSession: !!session?.session, locsCount: locs?.length ?? 0, lerr: lerr?.message });
    })();
  }, []);
  return <pre className="p-4 text-xs bg-gray-100 rounded">{JSON.stringify(state, null, 2)}</pre>;
}
