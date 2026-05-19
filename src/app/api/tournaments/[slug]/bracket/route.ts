import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Resolve tournament by slug (or numeric ID fallback)
  let tournamentId: number | null = null;
  const { data: bySlug } = await supabase
    .from("tournaments")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (bySlug) {
    tournamentId = bySlug.id;
  } else {
    const numericId = Number(slug);
    if (Number.isFinite(numericId) && numericId > 0) {
      const { data: byId } = await supabase
        .from("tournaments")
        .select("id")
        .eq("id", numericId)
        .eq("is_active", true)
        .maybeSingle();
      tournamentId = byId?.id ?? null;
    }
  }

  if (!tournamentId) return NextResponse.json(null);

  const { data: bracket } = await supabase
    .from("brackets")
    .select("*")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (!bracket) return NextResponse.json(null);

  const [{ data: participants }, { data: matches }] = await Promise.all([
    supabase
      .from("bracket_participants")
      .select("*")
      .eq("bracket_id", bracket.id)
      .order("seed"),
    supabase
      .from("bracket_matches")
      .select("*")
      .eq("bracket_id", bracket.id)
      .order("bracket_side")
      .order("round")
      .order("match_number"),
  ]);

  return NextResponse.json({
    bracket,
    participants: participants ?? [],
    matches:      matches ?? [],
  });
}
