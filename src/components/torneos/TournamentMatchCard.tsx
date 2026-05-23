"use client";

// Custom matchComponent for `@g-loot/react-tournament-brackets`.
//
// Renders one match (two slots stacked) with the participant's avatar +
// display name + score. Used in two places:
//   • TournamentBracketView (public tournament page, normal scale)
//   • TournamentTvView      (the /torneos/[slug]/tv fullscreen view,
//                             configured with much larger box dimensions)
//
// The component receives `topParty` / `bottomParty` from the library; we
// extended ParticipantType with extra fields (`avatarUrl`, `username`,
// `eliminated`) when transforming DB rows in `buildMatchType`. Those fields
// flow through as `[key: string]: unknown` per the type shim.

import type { MatchComponentProps, ParticipantType } from "@g-loot/react-tournament-brackets";
import { Avatar } from "@/components/ui/Avatar";

type ExtendedParty = ParticipantType & {
  avatarUrl?: string | null;
  username?:  string | null;
  eliminated?: boolean;
};

type Scale = "regular" | "tv";

interface Factory {
  (props: MatchComponentProps): React.ReactElement;
}

function buildCard(scale: Scale): Factory {
  const sizeAvatar = scale === "tv" ? "lg"     : "sm";
  const fontName   = scale === "tv" ? "text-2xl" : "text-sm";
  const fontMeta   = scale === "tv" ? "text-base" : "text-[10px]";
  const padding    = scale === "tv" ? "px-5 py-4" : "px-3 py-2";
  const dividerH   = scale === "tv" ? "h-px"     : "h-px";

  return function MatchCard({ match, topParty, bottomParty }) {
    const top    = topParty    as ExtendedParty;
    const bottom = bottomParty as ExtendedParty;

    return (
      <div className="w-full h-full bg-surface-container border border-surface-container-high flex flex-col justify-center">
        <Slot
          party={top}
          completed={match.state === "PLAYED"}
          padding={padding}
          fontName={fontName}
          fontMeta={fontMeta}
          sizeAvatar={sizeAvatar}
        />
        <div className={`${dividerH} bg-surface-container-low`} />
        <Slot
          party={bottom}
          completed={match.state === "PLAYED"}
          padding={padding}
          fontName={fontName}
          fontMeta={fontMeta}
          sizeAvatar={sizeAvatar}
        />
      </div>
    );
  };
}

function Slot({
  party, completed, padding, fontName, fontMeta, sizeAvatar,
}: {
  party: ExtendedParty;
  completed: boolean;
  padding: string;
  fontName: string;
  fontMeta: string;
  sizeAvatar: "sm" | "lg";
}) {
  const isWinner    = !!party.isWinner;
  const isLoser     = completed && !isWinner;
  const isTbd       = party.name === "TBD" || !party.name;
  const displayName = party.name ?? "TBD";

  return (
    <div className={`flex items-center gap-3 ${padding} ${isWinner ? "bg-primary-container/15" : ""} ${isLoser ? "opacity-40" : ""}`}>
      {isTbd ? (
        <div className={`${sizeAvatar === "lg" ? "w-14 h-14" : "w-8 h-8"} bg-surface-container-low flex items-center justify-center`}>
          <span className={`material-symbols-outlined text-outline ${sizeAvatar === "lg" ? "text-2xl" : "text-sm"}`}>
            help
          </span>
        </div>
      ) : (
        <Avatar src={party.avatarUrl ?? null} name={displayName} size={sizeAvatar} square />
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-headline font-black uppercase tracking-tight truncate ${fontName} ${isWinner ? "text-primary-container" : isTbd ? "text-outline" : "text-on-surface"}`}>
          {displayName}
        </p>
        {party.username && !isTbd && (
          <p className={`font-body text-outline truncate ${fontMeta}`}>@{party.username}</p>
        )}
      </div>
      {party.resultText && (
        <span className={`font-headline font-black tabular-nums ${fontName} ${isWinner ? "text-primary-container" : "text-on-surface"}`}>
          {party.resultText}
        </span>
      )}
      {isWinner && (
        <span
          className={`material-symbols-outlined text-primary-container ${sizeAvatar === "lg" ? "text-3xl" : "text-base"}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
      )}
    </div>
  );
}

export const TournamentMatchCard   = buildCard("regular");
export const TournamentMatchCardTv = buildCard("tv");
