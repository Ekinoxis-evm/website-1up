// Tournament TV view — `/torneos/[slug]/tv`
//
// Fullscreen, no chrome, designed to be cast to a venue TV during a live
// event. Shows: huge tournament title up top, bracket scaled to fit, and a
// sponsor strip at the bottom. The client view polls the public bracket
// endpoint every 15s so the screen updates as the admin records winners on
// the cockpit's Bracket tab.
//
// Lives in the `(bare)` route group so it inherits no nav chrome.

import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { TournamentTvView } from "@/components/torneos/TournamentTvView";
import { TournamentTvStandings } from "@/components/torneos/TournamentTvStandings";

export default async function TournamentTvPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: tournament } = await supabaseAdmin
    .from("tournaments")
    .select("id, name, slug, image_url, sponsor_name, sponsor_website_url, sponsor_logo_url, competition_format, games(name)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!tournament) notFound();

  return tournament.competition_format === "league"
    ? <TournamentTvStandings tournament={tournament} />
    : <TournamentTvView tournament={tournament} />;
}
