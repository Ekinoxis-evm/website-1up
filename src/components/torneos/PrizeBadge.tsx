import type { TournamentPrize } from "@/types/database.types";

const MEDAL = ["", "🥇", "🥈", "🥉"];

function formatPrize(p: TournamentPrize): string {
  const parts: string[] = [];
  if ((p.prize_type === "tokens" || p.prize_type === "both") && p.amount_tokens) {
    parts.push(`${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`);
  }
  if ((p.prize_type === "cop" || p.prize_type === "both") && p.amount_cop) {
    parts.push(`$${p.amount_cop.toLocaleString("es-CO")} COP`);
  }
  if (p.includes_pass && p.pass_days) {
    parts.push(`Pase ${p.pass_days}d`);
  }
  return parts.join(" + ");
}

export function PrizeBadge({ prizes }: { prizes: TournamentPrize[] }) {
  const first = prizes.find((p) => p.position === 1);
  if (!first) return null;
  const label = formatPrize(first);
  if (!label) return null;
  return (
    <span className="flex items-center gap-1 text-secondary">
      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
        workspace_premium
      </span>
      <span className="font-headline font-bold text-xs uppercase tracking-widest">
        {label}
      </span>
    </span>
  );
}

export function PrizePodium({ prizes }: { prizes: TournamentPrize[] }) {
  const sorted = [...prizes].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return null;
  return (
    <div className="space-y-2">
      {sorted.map((p) => {
        const moneyLabel = formatPrize(p);
        const hasReward  = !!(p.reward_text || p.reward_image_url);
        return (
          <div key={p.position} className="flex items-start gap-3">
            <span className="text-xl w-7 text-center leading-7">{MEDAL[p.position] ?? p.position}</span>
            <div className="flex-1 bg-surface-container-high px-3 py-2">
              {moneyLabel && (
                <span className="font-headline font-bold text-sm text-on-surface">{moneyLabel}</span>
              )}
              {hasReward && (
                <div className="flex items-center gap-3 mt-1">
                  {p.reward_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.reward_image_url}
                      alt={p.reward_text ?? "Premio"}
                      className="h-16 w-16 object-cover shrink-0 bg-surface-container-low"
                    />
                  )}
                  {p.reward_text && (
                    <span className="font-body text-xs text-on-surface-variant leading-snug">{p.reward_text}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
