import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { signStreamToken } from "@/lib/stream";

// Any authenticated user can view intro videos — no enrollment required.
export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await req.json();

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("intro_video_uid")
    .eq("id", courseId)
    .eq("is_active", true)
    .single();

  if (!course?.intro_video_uid) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = await signStreamToken(course.intro_video_uid);
  return NextResponse.json({ token });
}
