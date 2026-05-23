import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { signStreamToken } from "@/lib/stream";
import { getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await req.json();

  const { data: content } = await supabaseAdmin
    .from("academia_content")
    .select("stream_uid, course_id")
    .eq("id", contentId)
    .eq("is_published", true)
    .single();

  if (!content?.stream_uid) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 403 });

  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_profile_id", profile.id)
    .eq("course_id", content.course_id)
    .eq("payment_status", "approved")
    .single();

  if (!enrollment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  // M-A6.3: bind the JWT to the caller's IP via CF Stream `accessRules`.
  const token = await signStreamToken(content.stream_uid, { clientIp: getClientIp(req) });
  return NextResponse.json({ token });
}
