import { supabaseAdmin } from "@/lib/supabase";
import { PassPurchasePanel } from "@/components/perfil/PassPurchasePanel";

export const metadata = { title: "1UP Pass — 1UP App" };

export default async function AppPassPage() {
  const [{ data: config }, { data: benefits }] = await Promise.all([
    supabaseAdmin.from("pass_config").select("*").eq("id", 1).single(),
    supabaseAdmin.from("pass_benefits").select("*").order("sort_order").order("id"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl md:text-7xl text-on-surface leading-none tracking-tighter">
          TU <span className="text-primary">1UP PASS</span>
        </h1>
        <div className="h-1 w-16 bg-secondary-container mt-3" />
      </div>

      <PassPurchasePanel config={config ?? null} benefits={benefits ?? []} />
    </div>
  );
}
