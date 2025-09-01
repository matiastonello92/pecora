import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId") ?? "";
    const locationId = url.searchParams.get("locationId") ?? "";

    const sbUserClient = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authErr } = await sbUserClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({}, { status: 401 });
    if (!orgId) return NextResponse.json({ permissions: [] }, { status: 200 });

    const admin = await supabaseAdmin();

    // Usa la funzione SQL appena creata (più performante e centralizzata)
    const { data, error } = await admin
      .rpc("get_effective_permissions", {
        p_user: user.id,
        p_org: orgId,
        p_location: locationId || null
      });

    if (error) {
      // fallback safe: restituisci vuoto per non bloccare UI
      return NextResponse.json({ permissions: [] }, { status: 200 });
    }

    const perms = Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
    return NextResponse.json({ permissions: Array.from(new Set(perms)) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "internal" }, { status: 500 });
  }
}
