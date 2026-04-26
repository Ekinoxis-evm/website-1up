import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCookieToken } from "@/lib/privy";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { OnboardingWizard } from "@/components/perfil/OnboardingWizard";

export const metadata = { title: "Bienvenido — 1UP App" };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-token")?.value;
  const claims = await verifyCookieToken(token);
  if (!claims) redirect(`${APP_URL}/login`);

  // Already onboarded → go to app
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("onboarding_completed_at")
    .eq("privy_user_id", claims.userId)
    .maybeSingle();

  if (profile?.onboarding_completed_at) redirect(`${APP_URL}`);

  const { data: games } = await supabase
    .from("games")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      {/* Top bar */}
      <div className="h-1 w-full bg-primary-container" />
      <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-container">
        <div className="font-headline font-black text-primary italic text-2xl">1UP</div>
        <div className="font-headline text-xs uppercase tracking-widest text-outline">Gaming Tower</div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <OnboardingWizard games={games ?? []} />
      </div>
    </div>
  );
}
