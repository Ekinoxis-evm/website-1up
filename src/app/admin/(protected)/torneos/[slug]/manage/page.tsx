// Unified admin cockpit for a single tournament — server-component loader.
//
// Parallel-loads everything the cockpit needs in one round trip so the four
// embedded tabs (Info / Inscripciones / Bracket / Premios) render with full
// data on first paint:
//   • tournament row + game + prizes
//   • full registration list (avatars joined) — the Inscripciones tab embeds
//     `AdminTournamentRegistrationsPanel` and uses this for instant render
//   • bracket meta — the Bracket tab's panel auto-fetches richer detail on
//     mount; this lookup just powers the cockpit header pill
//   • tournament_results (with avatars) — Premios tab inputs
//
// The standalone admin pages (/admin/tournament-registrations, etc.) stay
// untouched as the global filter views; the cockpit reuses the same data
// shape but scoped to one tournament for instant inline editing.

import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { getComprobanteSignedUrl } from "@/lib/blob";
import { AdminTournamentCockpit } from "@/components/admin/AdminTournamentCockpit";

export default async function AdminTournamentManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: tournament } = await supabaseAdmin
    .from("tournaments")
    .select("*, games(id, name), tournament_prizes(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (!tournament) notFound();

  const [
    { data: registrations },
    { data: bracket },
    { data: results },
    { data: games },
    { data: passConfig },
    { data: entryOrders },
  ] = await Promise.all([
    supabaseAdmin
      .from("tournament_registrations")
      .select("*, user_profiles(nombre, apellidos, username, numero_documento, avatar_url)")
      .eq("tournament_id", tournament.id)
      .order("registered_at", { ascending: false }),
    supabaseAdmin
      .from("brackets")
      .select("id, status, format, participant_count")
      .eq("tournament_id", tournament.id)
      .maybeSingle(),
    supabaseAdmin
      .from("tournament_results")
      .select("*, user_profiles(nombre, apellidos, username, avatar_url), pass:passes!tournament_results_pass_id_fkey(state)")
      .eq("tournament_id", tournament.id)
      .order("position"),
    // Needed by the inline-editable Info tab's game selector.
    supabaseAdmin.from("games").select("id, name").order("name"),
    // Default duration for the "Incluir Pase 1UP" toggle in the prize editor.
    supabaseAdmin.from("pass_config").select("duration_days").eq("id", 1).maybeSingle(),
    // Entry-fee payment orders (v2.41.0) — Pagos tab approval panel.
    supabaseAdmin
      .from("tournament_entry_orders")
      .select("*, user_profiles(nombre, apellidos, email, username, avatar_url)")
      .eq("tournament_id", tournament.id)
      .order("created_at", { ascending: false }),
  ]);

  // Comprobantes live in a private bucket — sign them for the admin preview.
  const entryOrdersSigned = await Promise.all((entryOrders ?? []).map(async (order) => {
    if (!order.comprobante_url) return order;
    const signedUrl = await getComprobanteSignedUrl(order.comprobante_url);
    return { ...order, comprobante_url: signedUrl };
  }));

  return (
    <AdminTournamentCockpit
      tournament={tournament}
      registrations={registrations ?? []}
      bracket={bracket ?? null}
      results={results ?? []}
      games={games ?? []}
      defaultPassDays={passConfig?.duration_days ?? 30}
      entryOrders={entryOrdersSigned}
    />
  );
}
