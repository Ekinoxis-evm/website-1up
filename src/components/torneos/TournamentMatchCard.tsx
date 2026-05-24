"use client";

// Custom matchComponent for `@g-loot/react-tournament-brackets`.
//
// Renders one match (two slots stacked) with the participant's avatar +
// display name + score. Three scales:
//   • TournamentMatchCard       — regular (public tournament page), 32px avatars, read-only
//   • TournamentMatchCardTv     — TV view, 56px avatars + big typography, read-only
//   • makeAdminMatchCard(...)   — admin (cockpit Bracket tab), 40px avatars, INTERACTIVE
//
// The admin variant is built per-render with click handlers closed over the
// callbacks the admin panel passes in. Clicking a participant in a "ready"
// match marks them as winner. Clicking either slot of a "completed" match
// asks for confirmation and undoes the result.
//
// The component receives `topParty` / `bottomParty` from the library; we
// extended ParticipantType with extra fields (`avatarUrl`, `username`,
// `eliminated`) when transforming DB rows in `buildMatchType`. Those fields
// flow through as `[key: string]: unknown` per the type shim.

import type { MatchComponentProps, ParticipantType } from "@g-loot/react-tournament-brackets";
import { Avatar } from "@/components/ui/Avatar";

type ExtendedParty = ParticipantType & {
  avatarUrl?:   string | null;
  username?:    string | null;
  eliminated?:  boolean;
  realId?:      number;            // bracket_participants.id (number) — needed for the admin pick action
};

type Scale = "regular" | "tv" | "admin";

interface Factory {
  (props: MatchComponentProps): React.ReactElement;
}

interface AdminCallbacks {
  onPickWinner: (matchId: number, winnerId: number) => void;
  onUndo:       (matchId: number) => void;
  busy:         boolean;
}

function buildCard(scale: Scale, admin?: AdminCallbacks): Factory {
  const sizeAvatar = scale === "tv" ? "lg" : scale === "admin" ? "md"  : "sm";
  const fontName   = scale === "tv" ? "text-2xl" : scale === "admin" ? "text-base" : "text-sm";
  const fontMeta   = scale === "tv" ? "text-base" : scale === "admin" ? "text-[11px]" : "text-[10px]";
  const padding    = scale === "tv" ? "px-5 py-4" : scale === "admin" ? "px-4 py-3" : "px-3 py-2";

  return function MatchCard({ match, topParty, bottomParty }) {
    const top    = topParty    as ExtendedParty;
    const bottom = bottomParty as ExtendedParty;

    const matchId      = Number(match.id);
    const isCompleted  = match.state === "PLAYED";
    // Library state mapping: our DB "ready" → lib "NO_SHOW". Yes, weird,
    // but that's what the lib expects (per the STATE_MAP in TournamentBracketView).
    const isReady      = match.state === "NO_SHOW" && top.name !== "TBD" && bottom.name !== "TBD";

    function handleSlot(party: ExtendedParty) {
      if (!admin || admin.busy) return;
      if (isReady && party.realId) {
        admin.onPickWinner(matchId, party.realId);
        return;
      }
      if (isCompleted) {
        if (typeof window !== "undefined" && window.confirm(
          "¿Deshacer este resultado? Solo se puede deshacer si ningún match posterior ya se jugó.",
        )) {
          admin.onUndo(matchId);
        }
      }
    }

    const interactable = !!admin && (isReady || isCompleted);

    return (
      <div className={`w-full h-full bg-surface-container border border-surface-container-high flex flex-col justify-center ${
        interactable ? "cursor-pointer" : ""
      }`}>
        <Slot
          party={top}
          completed={isCompleted}
          padding={padding}
          fontName={fontName}
          fontMeta={fontMeta}
          sizeAvatar={sizeAvatar}
          clickable={!!admin && isReady}
          onClick={() => handleSlot(top)}
        />
        <div className="h-px bg-surface-container-low" />
        <Slot
          party={bottom}
          completed={isCompleted}
          padding={padding}
          fontName={fontName}
          fontMeta={fontMeta}
          sizeAvatar={sizeAvatar}
          clickable={!!admin && isReady}
          onClick={() => handleSlot(bottom)}
        />
        {admin && isCompleted && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleSlot(top); }}
            disabled={admin.busy}
            className="bg-surface-container-high text-outline hover:text-error font-headline font-bold text-[9px] uppercase tracking-widest px-2 py-1 flex items-center justify-center gap-1 disabled:opacity-40 transition-colors"
            title="Deshacer resultado"
          >
            <span className="material-symbols-outlined text-xs">undo</span>
            Deshacer
          </button>
        )}
      </div>
    );
  };
}

function Slot({
  party, completed, padding, fontName, fontMeta, sizeAvatar, clickable, onClick,
}: {
  party:      ExtendedParty;
  completed:  boolean;
  padding:    string;
  fontName:   string;
  fontMeta:   string;
  sizeAvatar: "sm" | "md" | "lg";
  clickable?: boolean;
  onClick?:   () => void;
}) {
  const isWinner    = !!party.isWinner;
  const isLoser     = completed && !isWinner;
  const isTbd       = party.name === "TBD" || !party.name;
  const displayName = party.name ?? "TBD";

  const wrapperClasses = `flex items-center gap-3 ${padding} ${
    isWinner ? "bg-primary-container/15" : ""
  } ${isLoser ? "opacity-40" : ""} ${
    clickable && !isTbd ? "hover:bg-primary-container/20 transition-colors" : ""
  }`;

  const content = (
    <>
      {isTbd ? (
        <div className={`${
          sizeAvatar === "lg" ? "w-14 h-14" : sizeAvatar === "md" ? "w-10 h-10" : "w-8 h-8"
        } bg-surface-container-low flex items-center justify-center`}>
          <span className={`material-symbols-outlined text-outline ${
            sizeAvatar === "lg" ? "text-2xl" : "text-sm"
          }`}>
            help
          </span>
        </div>
      ) : (
        <Avatar src={party.avatarUrl ?? null} name={displayName} size={sizeAvatar} square />
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-headline font-black uppercase tracking-tight truncate ${fontName} ${
          isWinner ? "text-primary-container" : isTbd ? "text-outline" : "text-on-surface"
        }`}>
          {displayName}
        </p>
        {party.username && !isTbd && (
          <p className={`font-body text-outline truncate ${fontMeta}`}>@{party.username}</p>
        )}
      </div>
      {party.resultText && (
        <span className={`font-headline font-black tabular-nums ${fontName} ${
          isWinner ? "text-primary-container" : "text-on-surface"
        }`}>
          {party.resultText}
        </span>
      )}
      {isWinner && (
        <span
          className={`material-symbols-outlined text-primary-container ${
            sizeAvatar === "lg" ? "text-3xl" : "text-base"
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
      )}
      {clickable && !isTbd && (
        <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-outline/70">
          Ganó
        </span>
      )}
    </>
  );

  if (clickable && !isTbd) {
    return (
      <button type="button" onClick={onClick} className={`text-left w-full ${wrapperClasses}`}>
        {content}
      </button>
    );
  }

  return <div className={wrapperClasses}>{content}</div>;
}

export const TournamentMatchCard   = buildCard("regular");
export const TournamentMatchCardTv = buildCard("tv");

// Admin variant — built per-render with click handlers. The bracket view
// rebuilds this factory whenever the busy flag changes so the matchComponent
// instances always see the freshest callbacks.
export function makeAdminTournamentMatchCard(cb: AdminCallbacks) {
  return buildCard("admin", cb);
}
