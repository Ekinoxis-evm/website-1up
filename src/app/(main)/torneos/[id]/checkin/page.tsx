import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { TournamentCheckinClient } from "@/components/torneos/TournamentCheckinClient";

export default async function TournamentCheckinPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const { data: t } = await supabase
    .from("tournaments")
    .select("id, name, status, date, is_active")
    .eq("id", numericId)
    .eq("is_active", true)
    .maybeSingle();

  if (!t) notFound();

  return (
    <TournamentCheckinClient
      tournament={{
        id:     t.id,
        name:   t.name,
        status: t.status,
        date:   t.date,
      }}
    />
  );
}
