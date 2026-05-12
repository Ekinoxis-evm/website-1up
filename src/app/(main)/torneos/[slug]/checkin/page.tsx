import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { TournamentCheckinClient } from "@/components/torneos/TournamentCheckinClient";
import type { Tournament } from "@/types/database.types";

type TRow = { id: number; name: string; status: Tournament["status"]; date: string | null; is_active: boolean };

export default async function TournamentCheckinPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const SELECT = "id, name, status, date, is_active";

  // Try by slug first, then fall back to numeric ID for old QR codes
  const { data: bySlug } = await supabase
    .from("tournaments")
    .select(SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  let t: TRow | null = bySlug as TRow | null;

  if (!t) {
    const numericId = Number(slug);
    if (Number.isFinite(numericId) && numericId > 0) {
      const { data: byId } = await supabase
        .from("tournaments")
        .select(SELECT)
        .eq("id", numericId)
        .eq("is_active", true)
        .maybeSingle();
      t = byId as TRow | null;
    }
  }

  if (!t) notFound();

  return (
    <TournamentCheckinClient
      tournament={{ id: t.id, name: t.name, status: t.status, date: t.date }}
    />
  );
}
