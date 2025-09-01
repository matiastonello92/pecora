import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId") ?? "";
    const locationId = url.searchParams.get("locationId") ?? "";

    // 1) Authenticate user using server-side Supabase client (via @supabase/ssr)
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({}, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ permissions: [] }, { status: 200 });
    }

    // 2) RPC with service role: supabaseAdmin is a client instance, not a function
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
