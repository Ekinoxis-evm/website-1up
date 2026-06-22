import { supabaseAdmin } from "@/lib/supabase";
import { PassPurchasePanel } from "@/components/perfil/PassPurchasePanel";
import { MisPases } from "@/components/perfil/MisPases";

export const metadata = { title: "1UP Pass — 1UP App" };

export default async function AppPassPage() {
  const [{ data: config }, { data: benefits }, { data: methodCfg }] = await Promise.all([
    supabaseAdmin.from("pass_config").select("*").eq("id", 1).single(),
    supabaseAdmin.from("pass_benefits").select("*").order("sort_order").order("id"),
    supabaseAdmin.from("service_payment_methods").select("cash_enabled, card_enabled").eq("service", "pass").maybeSingle(),
  ]);

  const cashEnabled = methodCfg?.cash_enabled === true;
  const cardEnabled =
    methodCfg?.card_enabled === true &&
    process.env.PAYMENTS_CARD_LIVE === "true" &&
    (config?.price_token ?? 0) > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl md:text-7xl text-on-surface leading-none tracking-tighter">
          TU <span className="text-primary">1UP PASS</span>
        </h1>
        <div className="h-1 w-16 bg-secondary-container mt-3" />
      </div>

      <MisPases />

      <PassPurchasePanel config={config ?? null} benefits={benefits ?? []} cashEnabled={cashEnabled} cardEnabled={cardEnabled} />
    </div>
  );
}
