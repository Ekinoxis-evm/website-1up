import { supabaseAdmin } from "@/lib/supabase";

export class CourseAccessError extends Error {
  constructor(public readonly code: "UNAUTHORIZED" | "NOT_ENROLLED" | "NOT_FOUND" | "INACTIVE", message: string) {
    super(message);
    this.name = "CourseAccessError";
  }
  get status() {
    return this.code === "UNAUTHORIZED" ? 401
      : this.code === "NOT_ENROLLED" ? 403
      : this.code === "NOT_FOUND" ? 404
      : 410;
  }
}

export async function resolveProfileId(privyUserId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", privyUserId)
    .single();
  if (!data) throw new CourseAccessError("NOT_FOUND", "No profile");
  return data.id;
}

export async function assertEnrollment(
  privyUserId: string,
  courseId: number
): Promise<{ profileId: number }> {
  const profileId = await resolveProfileId(privyUserId);

  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_profile_id", profileId)
    .eq("course_id", courseId)
    .eq("payment_status", "approved")
    .single();

  if (!enrollment) throw new CourseAccessError("NOT_ENROLLED", "Not enrolled");
  return { profileId };
}

export async function isEnrolled(privyUserId: string, courseId: number): Promise<boolean> {
  try {
    await assertEnrollment(privyUserId, courseId);
    return true;
  } catch {
    return false;
  }
}

export async function courseIdFromSession(sessionId: number): Promise<number> {
  const { data } = await supabaseAdmin
    .from("course_sessions")
    .select("module_id, course_modules!inner(course_id)")
    .eq("id", sessionId)
    .single();
  if (!data) throw new CourseAccessError("NOT_FOUND", "Session not found");
  const mod = data.course_modules as unknown as { course_id: number };
  return mod.course_id;
}
