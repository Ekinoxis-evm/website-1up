import type { Player } from "@/db/schema";
import { PlayerCard } from "./PlayerCard";

interface Props { players: Player[] }

export function PlayerGrid({ players }: Props) {
  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-lowest">
      <div className="mb-12">
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          THE <span className="text-primary">LINEUP</span>
        </h2>
        <div className="h-2 w-24 bg-tertiary mt-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {players.map((player, i) => (
          <PlayerCard key={player.id} player={player} index={i} />
        ))}
        {players.length === 0 && (
          <p className="col-span-4 text-outline font-body text-center py-12">
            Los jugadores se configuran desde el panel de administración.
          </p>
        )}
      </div>
    </section>
  );
}
