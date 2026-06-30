// Presentational league standings table — shared by the admin cockpit, the
// public tournament page, and the TV view. Pure Tailwind, 0px radius, no 1px
// dividers (row separation via alternating background). Avatars use rounded-full.

import type { StandingRow } from "@/lib/league/standings";

export type StandingsParticipant = {
  id:          number;
  display_name: string;
  avatar_url?:  string | null;
};

export function StandingsTable({
  standings,
  participants,
  size = "md",
}: {
  standings:    StandingRow[];
  participants: StandingsParticipant[];
  size?:        "md" | "tv";
}) {
  const byId = new Map(participants.map(p => [p.id, p]));
  const tv = size === "tv";

  const cellPad = tv ? "px-4 py-4" : "px-3 py-2.5";
  const nameText = tv ? "text-2xl" : "text-sm";
  const statText = tv ? "text-xl" : "text-sm";
  const avatar = tv ? "w-12 h-12" : "w-7 h-7";

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-container-high text-outline">
            <Th className={cellPad} center>#</Th>
            <Th className={cellPad}>Jugador</Th>
            <Th className={cellPad} center>PJ</Th>
            <Th className={cellPad} center>G</Th>
            <Th className={cellPad} center>E</Th>
            <Th className={cellPad} center>P</Th>
            <Th className={cellPad} center>DG</Th>
            <Th className={cellPad} center>PTS</Th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const p = byId.get(row.participantId);
            const leader = row.rank === 1;
            const bg = leader
              ? "bg-primary-container/15"
              : i % 2 === 0 ? "bg-surface-container" : "bg-surface-container/40";
            return (
              <tr key={row.participantId} className={bg}>
                <td className={`${cellPad} text-center font-headline font-black ${statText} ${leader ? "text-primary-container" : "text-outline"}`}>
                  {row.rank}
                </td>
                <td className={cellPad}>
                  <div className="flex items-center gap-3 min-w-0">
                    {p?.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.avatar_url} alt="" className={`${avatar} rounded-full object-cover shrink-0`} />
                      : <span className={`${avatar} rounded-full bg-surface-container-high shrink-0`} />}
                    <span className={`font-headline font-bold ${nameText} uppercase tracking-tight truncate ${leader ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {p?.display_name ?? `#${row.participantId}`}
                    </span>
                  </div>
                </td>
                <Td className={cellPad} text={statText}>{row.played}</Td>
                <Td className={cellPad} text={statText}>{row.wins}</Td>
                <Td className={cellPad} text={statText}>{row.draws}</Td>
                <Td className={cellPad} text={statText}>{row.losses}</Td>
                <Td className={cellPad} text={statText}>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</Td>
                <td className={`${cellPad} text-center font-headline font-black ${statText} ${leader ? "text-primary-container" : "text-on-surface"}`}>
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className, center }: { children: React.ReactNode; className?: string; center?: boolean }) {
  return (
    <th className={`${className} font-headline font-bold text-[10px] uppercase tracking-widest ${center ? "text-center" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, className, text }: { children: React.ReactNode; className?: string; text: string }) {
  return (
    <td className={`${className} text-center font-headline font-bold ${text} text-on-surface-variant`}>
      {children}
    </td>
  );
}
