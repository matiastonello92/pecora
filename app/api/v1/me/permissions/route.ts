import { NextResponse } from "next/server";
import { supabaseServer } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId") ?? "";
    const locationId = url.searchParams.get("locationId") ?? "";

    // 1) Auth utente via @supabase/ssr (server-side)
    const sb = await supabaseServer();
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({}, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ permissions: [] }, { status: 200 });
    }

    // 2) RPC con service role: supabaseAdmin è un CLIENT, NON UNA FUNZIONE
    const { data, error } = await supabaseAdmin.rpc("get_effective_permissions", {
      p_user: user.id,
      p_org: orgId,
      p_location: locationId || null,
    });

    if (error) {
      // fallback safe per non bloccare la UI
      return NextResponse.json({ permissions: [] }, { status: 200 });
    }

    const perms = Array.isArray(data)
      ? data.filter((x: unknown): x is string => typeof x === "string")
      : [];

    return NextResponse.json({ permissions: Array.from(new Set(perms)) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "internal" }, { status: 500 });
  }
}
