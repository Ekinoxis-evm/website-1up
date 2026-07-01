// Presentational VS card for a single match — used by the "Mi partido" and
// "Ronda" player views for both Copa and Liga. Pure Tailwind, 0px radius,
// avatars rounded-full. No 1px dividers — separation via background.

export type MatchSide = { name: string; avatarUrl?: string | null } | null;

const STATE_LABEL: Record<string, string> = {
  pending: "Por jugar",
  ready: "Listo",
  in_progress: "En vivo",
  completed: "Finalizado",
  bye: "BYE",
};

export function MatchVsCard({
  p1, p2, p1Score, p2Score, state, isDraw = false, winnerSide = null,
  size = "md", highlight = false,
}: {
  p1: MatchSide;
  p2: MatchSide;
  p1Score?: number | null;
  p2Score?: number | null;
  state: string;
  isDraw?: boolean;
  winnerSide?: 1 | 2 | null;
  size?: "md" | "lg";
  highlight?: boolean;
}) {
  const lg = size === "lg";
  const done = state === "completed";
  const live = state === "in_progress";
  const hasScore = p1Score != null && p2Score != null;

  return (
    <div className={`${highlight ? "bg-primary-container/15" : "bg-surface-container"} ${lg ? "p-6" : "p-4"}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">
          {highlight ? "Mi partido" : "Partido"}
        </span>
        <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-0.5 ${
          live ? "bg-primary text-background animate-pulse"
          : done ? "bg-surface-container-high text-outline"
          : "bg-secondary/15 text-secondary"
        }`}>
          {STATE_LABEL[state] ?? state}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Side side={p1} score={p1Score} lg={lg} won={done && winnerSide === 1} align="left" />
        <div className="shrink-0 text-center px-1">
          {done && hasScore ? (
            <span className={`font-headline font-black ${lg ? "text-3xl" : "text-xl"} ${isDraw ? "text-outline" : "text-primary-container"}`}>
              {p1Score}<span className="text-outline mx-1">-</span>{p2Score}
            </span>
          ) : (
            <span className={`font-headline font-black ${lg ? "text-2xl" : "text-lg"} text-outline`}>VS</span>
          )}
        </div>
        <Side side={p2} score={p2Score} lg={lg} won={done && winnerSide === 2} align="right" />
      </div>
    </div>
  );
}

function Side({ side, lg, won, align }: {
  side: MatchSide; score?: number | null; lg: boolean; won: boolean; align: "left" | "right";
}) {
  const avatar = lg ? "w-14 h-14" : "w-10 h-10";
  const text = lg ? "text-lg" : "text-sm";
  return (
    <div className={`flex-1 min-w-0 flex items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {side?.avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={side.avatarUrl} alt="" className={`${avatar} rounded-full object-cover shrink-0`} />
        : <span className={`${avatar} rounded-full bg-surface-container-high shrink-0`} />}
      <span className={`font-headline font-bold ${text} uppercase tracking-tight truncate ${won ? "text-on-surface" : "text-on-surface-variant"}`}>
        {side?.name ?? "Por definir"}
      </span>
    </div>
  );
}
