import { privyServer } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminPrivyUsersClient, type MergedUser } from "@/components/admin/AdminPrivyUsersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios — 1UP Gaming Tower" };

const TOKEN_CONTRACT = "0xF6813C71e620c654Ff6049a485E38D9494eFABdf";

type BlockscoutPage = {
  items: Array<{ address: { hash: string }; value: string }>;
  next_page_params: { items_count: number; value: string } | null;
};

async function fetchTokenHolders(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    let nextParams: Record<string, string> | null = null;
    for (let i = 0; i < 5; i++) {
      const url = new URL(
        `https://base.blockscout.com/api/v2/tokens/${TOKEN_CONTRACT}/holders`
      );
      if (nextParams) {
        Object.entries(nextParams).forEach(([k, v]) => url.searchParams.set(k, v));
      }
      const res = await fetch(url.toString(), { next: { revalidate: 300 } });
      if (!res.ok) break;
      const data = (await res.json()) as BlockscoutPage;
      for (const item of data.items ?? []) {
        map.set(item.address.hash.toLowerCase(), item.value);
      }
      if (data.next_page_params) {
        nextParams = {
          items_count: String(data.next_page_params.items_count),
          value: String(data.next_page_params.value),
        };
      } else {
        break;
      }
    }
  } catch {
    // Blockscout unavailable — balances shown as null
  }
  return map;
}

export default async function AdminPrivyUsersPage() {
  const [privyUsers, profilesRes, courseEnrollsRes, passEnrollsRes, gamesRes, tokenHolders] =
    await Promise.all([
      privyServer.getUsers().catch(() => []),
      supabaseAdmin
        .from("user_profiles")
        .select(
          "id, privy_user_id, nombre, apellidos, username, phone_country, phone_number, game_ids, tipo_documento, numero_documento, comfenalco_afiliado"
        ),
      supabaseAdmin
        .from("enrollments")
        .select("user_profile_id")
        .eq("payment_status", "approved")
        .eq("product_type", "course"),
      supabaseAdmin
        .from("enrollments")
        .select("user_profile_id")
        .eq("payment_status", "approved")
        .eq("product_type", "pass"),
      supabaseAdmin.from("games").select("id, name").order("name"),
      fetchTokenHolders(),
    ]);

  const profiles = profilesRes.data ?? [];
  const courseEnrolls = courseEnrollsRes.data ?? [];
  const passEnrolls = passEnrollsRes.data ?? [];
  const games = gamesRes.data ?? [];

  const profileByPrivyId = new Map(profiles.map((p) => [p.privy_user_id, p]));

  const courseCountByProfileId = new Map<number, number>();
  for (const e of courseEnrolls) {
    const id = e.user_profile_id as number;
    courseCountByProfileId.set(id, (courseCountByProfileId.get(id) ?? 0) + 1);
  }

  const passHolderProfileIds = new Set(passEnrolls.map((e) => e.user_profile_id as number));

  const gameNameById = new Map(games.map((g) => [g.id, g.name]));

  const users: MergedUser[] = privyUsers
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((u) => {
      const profile = profileByPrivyId.get(u.id);
      const walletAddr = u.wallet?.address?.toLowerCase() ?? null;
      return {
        privyId: u.id,
        createdAt: u.createdAt.toISOString(),
        isGuest: u.isGuest,
        email: u.email?.address ?? null,
        googleEmail: u.google?.email ?? null,
        discordEmail: u.discord?.email ?? null,
        walletAddress: u.wallet?.address ?? null,
        tokenBalance: walletAddr ? (tokenHolders.get(walletAddr) ?? null) : null,
        hasEmail: !!u.email,
        hasGoogle: !!u.google,
        hasDiscord: !!u.discord,
        hasProfile: !!profile,
        nombre: profile?.nombre ?? null,
        apellidos: profile?.apellidos ?? null,
        username: profile?.username ?? null,
        phoneCountry: profile?.phone_country ?? null,
        phoneNumber: profile?.phone_number ?? null,
        gameNames: (profile?.game_ids ?? []).map((id) => gameNameById.get(id) ?? "").filter(Boolean),
        tipoDocumento: profile?.tipo_documento ?? null,
        numeroDocumento: profile?.numero_documento ?? null,
        comfenalcoAfiliado: profile?.comfenalco_afiliado ?? null,
        courseCount: profile ? (courseCountByProfileId.get(profile.id) ?? 0) : 0,
        hasPass: profile ? passHolderProfileIds.has(profile.id) : false,
        blockscoutAvailable: tokenHolders.size > 0,
      };
    });

  return <AdminPrivyUsersClient users={users} />;
}
