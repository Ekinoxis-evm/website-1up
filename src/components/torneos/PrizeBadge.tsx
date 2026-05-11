import type { TournamentPrize } from "@/types/database.types";

const MEDAL = ["", "🥇", "🥈", "🥉"];

function formatPrize(p: TournamentPrize): string {
  if (p.prize_type === "tokens" && p.amount_tokens) {
    return `${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`;
  }
  if (p.prize_type === "cop" && p.amount_cop) {
    return `$${p.amount_cop.toLocaleString("es-CO")} COP`;
  }
  if (p.prize_type === "both") {
    const parts: string[] = [];
    if (p.amount_tokens) parts.push(`${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`);
    if (p.amount_cop)    parts.push(`$${p.amount_cop.toLocaleString("es-CO")} COP`);
    return parts.join(" + ");
  }
  return "";
}

export function PrizeBadge({ prizes }: { prizes: TournamentPrize[] }) {
  const first = prizes.find((p) => p.position === 1);
  if (!first) return null;
  return (
    <span className="flex items-center gap-1 text-secondary">
      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
        workspace_premium
      </span>
      <span className="font-headline font-bold text-xs uppercase tracking-widest">
        {formatPrize(first)}
      </span>
    </span>
  );
}

export function PrizePodium({ prizes }: { prizes: TournamentPrize[] }) {
  const sorted = [...prizes].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return null;
  return (
    <div className="space-y-2">
      {sorted.map((p) => (
        <div key={p.position} className="flex items-center gap-3">
          <span className="text-xl w-7 text-center">{MEDAL[p.position] ?? p.position}</span>
          <div className="flex-1 bg-surface-container-high px-3 py-2">
            <span className="font-headline font-bold text-sm text-on-surface">{formatPrize(p)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
