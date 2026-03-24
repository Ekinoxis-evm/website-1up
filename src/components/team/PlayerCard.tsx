import type { Player } from "@/types/database.types";

interface Props { player: Player; index: number }

const BORDER_COLORS = ["border-primary", "border-secondary", "border-tertiary", "border-white"];
const ROLE_BG = ["bg-primary-container", "bg-secondary-container", "bg-tertiary", "bg-white"];
const ROLE_TEXT = ["text-white", "text-white", "text-background", "text-background"];

const SOCIALS = [
  { key: "instagram_url" as const, icon: "photo_camera",   label: "IG"  },
  { key: "tiktok_url"   as const,  icon: "music_note",      label: "TT"  },
  { key: "kick_url"     as const,  icon: "live_tv",         label: "KCK" },
  { key: "youtube_url"  as const,  icon: "play_circle",     label: "YT"  },
];

export function PlayerCard({ player, index }: Props) {
  const border = BORDER_COLORS[index % BORDER_COLORS.length];
  const roleBg = ROLE_BG[index % ROLE_BG.length];
  const roleText = ROLE_TEXT[index % ROLE_TEXT.length];
  const isOffset = index % 2 === 1; // stagger odd cards down

  return (
    <div className={`group relative bg-surface-container ${border} border-l-4 ${isOffset ? "md:mt-8" : ""} overflow-hidden`}>
      {/* Photo */}
      <div className="aspect-[3/4] bg-surface-container-high relative overflow-hidden">
        {player.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo_url}
            alt={player.gamertag}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[6rem] text-surface-container-highest">person</span>
          </div>
        )}

        {/* Social overlay on hover */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          {SOCIALS.map(({ key, icon, label }) =>
            player[key] ? (
              <a
                key={key}
                href={player[key]!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 text-primary hover:text-primary-container transition-colors"
              >
                <span className="material-symbols-outlined">{icon}</span>
                <span className="text-[9px] font-headline font-black">{label}</span>
              </a>
            ) : null
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        {player.role && (
          <span className={`${roleBg} ${roleText} font-headline font-black text-[10px] px-2 py-0.5 uppercase tracking-widest inline-block mb-2`}>
            {player.role}
          </span>
        )}
        <div className="font-headline font-black text-2xl italic text-on-background leading-tight">
          {player.gamertag}
        </div>
        <div className="font-body text-sm text-on-surface-variant mt-1">{player.real_name}</div>
      </div>
    </div>
  );
}
