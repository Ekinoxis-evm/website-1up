// Unified admin cockpit for a single tournament.
//
// Loads everything an admin needs to manage one tournament in one place:
// the tournament row (with prizes + game), registration counts, bracket
// status, and the final-podium rows. Renders the cockpit client component
// which owns the UI shell (header, actions, tabs/cards).
//
// The existing /admin/torneos list and the per-action pages
// (tournament-registrations, tournament-brackets, tournament-results) stay
// fully intact as deep-link targets — the cockpit doesn't replace them, it
// orchestrates them.

import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
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

  // Parallelize the rest — none of these depend on each other.
  const [
    { count: regCount },
    { count: registeredCount },
    { count: attendedCount },
    { data: bracket },
    { data: results },
  ] = await Promise.all([
    supabaseAdmin
      .from("tournament_registrations")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournament.id),
    supabaseAdmin
      .from("tournament_registrations")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournament.id)
      .eq("status", "registered"),
    supabaseAdmin
      .from("tournament_registrations")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournament.id)
      .eq("status", "attended"),
    supabaseAdmin
      .from("brackets")
      .select("id, status, format, participant_count")
      .eq("tournament_id", tournament.id)
      .maybeSingle(),
    supabaseAdmin
      .from("tournament_results")
      .select("*, user_profiles(nombre, apellidos, username, avatar_url)")
      .eq("tournament_id", tournament.id)
      .order("position"),
  ]);

  return (
    <AdminTournamentCockpit
      tournament={tournament}
      counts={{
        total:      regCount      ?? 0,
        registered: registeredCount ?? 0,
        attended:   attendedCount  ?? 0,
      }}
      bracket={bracket ?? null}
      results={results ?? []}
    />
  );
}
