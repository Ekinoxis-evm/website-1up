import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { signStreamToken } from "@/lib/stream";

// Public — anyone can preview a course intro video on /academia/[courseId].
// CF Stream token is 1h-scoped to the single intro video UID and the video has
// requireSignedURLs: true, so this stays safely sandboxed.
export async function POST(req: NextRequest) {
  const { courseId } = await req.json();
  const id = Number(courseId);
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("intro_video_uid")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!course?.intro_video_uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await signStreamToken(course.intro_video_uid);
  return NextResponse.json({ token });
}
