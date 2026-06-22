import { supabaseAdmin } from "@/lib/supabase";
import { AdminTorneosClient } from "@/components/admin/AdminTorneosClient";

export default async function AdminTorneosPage() {
  const [{ data: tournaments }, { data: games }, { data: treasuryWallets }, { data: bankAccounts }, { data: passConfig }] = await Promise.all([
    supabaseAdmin.from("tournaments").select("*, games(id, name), tournament_prizes(*)").order("sort_order").order("date", { ascending: true }),
    supabaseAdmin.from("games").select("id, name").order("name"),
    supabaseAdmin.from("treasury_wallets").select("id, label, address").eq("is_active", true).order("sort_order").order("id"),
    supabaseAdmin.from("bank_accounts").select("id, bank_name, account_number").eq("is_active", true).order("sort_order").order("id"),
    supabaseAdmin.from("pass_config").select("duration_days").eq("id", 1).maybeSingle(),
  ]);
  return (
    <AdminTorneosClient
      tournaments={tournaments ?? []}
      games={games ?? []}
      treasuryWallets={treasuryWallets ?? []}
      bankAccounts={bankAccounts ?? []}
      defaultPassDays={passConfig?.duration_days ?? 30}
    />
  );
}
