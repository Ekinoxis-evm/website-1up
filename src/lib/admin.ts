import { supabaseAdmin } from "@/lib/supabase";

export function isEnvAdmin(email: string): boolean {
  const envEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return envEmails.includes(email.toLowerCase());
}

/**
 * Full admin check: env var first (fast), then DB table.
 */
export async function isAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (isEnvAdmin(normalized)) return true;
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  return !!data;
}
