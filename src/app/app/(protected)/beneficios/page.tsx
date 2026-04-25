import { supabase } from "@/lib/supabase";
import { BeneficiosTab } from "@/components/perfil/BeneficiosTab";
import type { AliadoCard } from "@/components/perfil/BeneficiosTab";

export const metadata = { title: "Beneficios — 1UP App" };

export default async function AppBeneficiosPage() {
  const [{ data: aliados }, { data: rules }] = await Promise.all([
    supabase
      .from("aliados")
      .select("id, name, logo_url, api_url")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("discount_rules")
      .select("aliado_id, discount_pct, applies_to")
      .eq("is_active", true)
      .not("aliado_id", "is", null),
  ]);

  const discountsByAliado = new Map<number, Array<{ pct: number; appliesTo: string }>>();
  for (const r of rules ?? []) {
    const id = r.aliado_id as number;
    if (!discountsByAliado.has(id)) discountsByAliado.set(id, []);
    discountsByAliado.get(id)!.push({ pct: r.discount_pct, appliesTo: r.applies_to });
  }

  const cards: AliadoCard[] = (aliados ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    logoUrl: a.logo_url ?? null,
    isComfenalco: a.name.toLowerCase().includes("comfenalco"),
    hasPendingApi: !a.api_url,
    discounts: discountsByAliado.get(a.id) ?? [],
  }));

  return <BeneficiosTab aliados={cards} />;
}
