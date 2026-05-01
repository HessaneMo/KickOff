import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { action, fingerprint, userId } = await req.json();

  if (!fingerprint) return NextResponse.json({ error: "missing fingerprint" }, { status: 400 });

  if (action === "check") {
    const { data } = await supabase
      .from("device_fingerprints")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    return NextResponse.json({ blocked: !!data });
  }

  if (action === "register") {
    if (!userId) return NextResponse.json({ error: "missing userId" }, { status: 400 });
    await supabase.from("device_fingerprints").insert({ fingerprint, user_id: userId });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
