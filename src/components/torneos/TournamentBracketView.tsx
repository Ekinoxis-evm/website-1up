"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  MatchType,
  ParticipantType,
  SingleElimLeaderboardProps,
  DoubleElimLeaderboardProps,
} from "@g-loot/react-tournament-brackets";
import type {
  Bracket,
  BracketParticipant,
  BracketMatch,
} from "@/types/database.types";
import {
  TournamentMatchCard,
  TournamentMatchCardTv,
  makeAdminTournamentMatchCard,
} from "@/components/torneos/TournamentMatchCard";

const SingleEliminationBracket = dynamic<SingleElimLeaderboardProps>(
  () => import("@g-loot/react-tournament-brackets").then(m => ({ default: m.SingleEliminationBracket })),
  { ssr: false, loading: () => <BracketSkeleton /> },
);
const DoubleEliminationBracket = dynamic<DoubleElimLeaderboardProps>(
  () => import("@g-loot/react-tournament-brackets").then(m => ({ default: m.DoubleEliminationBracket })),
  { ssr: false, loading: () => <BracketSkeleton /> },
);

// BracketParticipant is augmented with the joined user_profiles fields by
// `GET /api/tournaments/[slug]/bracket` — we don't redeclare the DB Row type;
// instead the consumer narrows when it transforms to MatchType.
type ParticipantWithProfile = BracketParticipant & {
  user_profiles: {
    avatar_url: string | null;
    username:   string | null;
    nombre:     string | null;
    apellidos:  string | null;
  } | null;
};

// ── State map ────────────────────────────────────────────────

const STATE_MAP: Record<string, string> = {
  completed:   "PLAYED",
  bye:         "WALK_OVER",
  ready:       "NO_SHOW",
  pending:     "NO_PARTY",
  in_progress: "NO_SHOW",
};

// ── Round label helpers ──────────────────────────────────────

function winnersLabel(round: number, totalRounds: number): string {
  if (round === 0) return "Play-in";   // pre-round for non-pow2 SE (v2.36.13)
  const remaining = totalRounds - round;
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semifinal";
  if (remaining === 2) return "Cuartos";
  return `Ronda ${round}`;
}

// ── Transform DB rows into @g-loot MatchType ─────────────────

function buildMatchType(
  match: BracketMatch,
  participantMap: Map<number, ParticipantWithProfile>,
  roundLabel: string,
): MatchType {
  const p1 = match.p1_id ? participantMap.get(match.p1_id) : undefined;
  const p2 = match.p2_id ? participantMap.get(match.p2_id) : undefined;

  const isCompleted = match.state === "completed";

  function toParty(
    participant: ParticipantWithProfile | undefined,
    score: number | null,
    isWinner: boolean,
    fallbackId: string,
  ): ParticipantType {
    if (!participant) {
      return { id: fallbackId, name: "TBD", status: null, resultText: null };
    }
    return {
      id:         participant.id,
      name:       participant.display_name,
      isWinner:   isCompleted && isWinner,
      resultText: isCompleted ? String(score ?? "") : null,
      status:     isCompleted ? "PLAYED" : null,
      // ─── Extended (consumed by the custom matchComponent) ──────────────
      avatarUrl:  participant.user_profiles?.avatar_url ?? null,
      username:   participant.user_profiles?.username   ?? null,
      eliminated: participant.eliminated,
      realId:     participant.id,   // bracket_participants.id — admin pick API needs this
    };
  }

  return {
    id:                   match.id,
    nextMatchId:          match.next_match_id ?? null,
    nextLooserMatchId:    match.next_loser_match_id ?? undefined,
    tournamentRoundText:  roundLabel,
    startTime:            "",
    state:                STATE_MAP[match.state] ?? "NO_PARTY",
    participants: [
      toParty(p1, match.p1_score, match.winner_id === match.p1_id, "tbd-p1"),
      toParty(p2, match.p2_score, match.winner_id === match.p2_id, "tbd-p2"),
    ],
  };
}

// ── Props ────────────────────────────────────────────────────

export interface BracketData {
  bracket:      Bracket;
  participants: ParticipantWithProfile[];
  matches:      BracketMatch[];
}

interface Props {
  data:  BracketData;
  /**
   * `tv`    — larger boxes + larger typography for venue / TV display
   * `admin` — interactive: clicks pick winner / undo via the supplied callbacks
   * default `regular` — read-only public render
   */
  scale?: "regular" | "tv" | "admin";
  /** Required when scale = "admin". Called with `(matchId, winnerParticipantId)`. */
  onPickWinner?: (matchId: number, winnerId: number) => void;
  /** Required when scale = "admin". Called with `matchId` when undoing a completed match. */
  onUndo?:       (matchId: number) => void;
  /** When true, the admin matchComponent suppresses clicks (request in flight). */
  busy?:         boolean;
}

// ── Component ────────────────────────────────────────────────

export function TournamentBracketView({
  data, scale = "regular", onPickWinner, onUndo, busy = false,
}: Props) {
  const { bracket, participants, matches } = data;

  const participantMap = new Map(participants.map(p => [p.id, p]));

  const matchComponent =
    scale === "tv"    ? TournamentMatchCardTv :
    scale === "admin" ? makeAdminTournamentMatchCard({
                          onPickWinner: onPickWinner ?? (() => {}),
                          onUndo:       onUndo ?? (() => {}),
                          busy,
                        })
                      : TournamentMatchCard;

  // Box dimensions scale with the avatar size in the custom card. TV mode is
  // significantly bigger so a venue screen can read it from across the room.
  // Admin mode is between the two — has room for the per-match undo button.
  // Regular (public page) is the densest — tighter columns + shorter boxes
  // so the tree fits more screens at full scale before the ResponsiveScale
  // wrapper has to shrink it further.
  const options =
    scale === "tv"    ? { style: { width: 460, boxHeight: 200, spaceBetweenColumns: 80, spaceBetweenRows: 32 } }
  : scale === "admin" ? { style: { width: 320, boxHeight: 152, spaceBetweenColumns: 56, spaceBetweenRows: 24 } }
  :                     { style: { width: 240, boxHeight: 100, spaceBetweenColumns: 40, spaceBetweenRows: 16 } };

  if (bracket.format === "single_elimination") {
    const wRounds = bracket.rounds_winners;
    const libraryMatches: MatchType[] = matches
      .filter(m => m.bracket_side === "winners")
      .map(m => buildMatchType(m, participantMap, winnersLabel(m.round, wRounds)));

    return (
      <ResponsiveScale>
        <SingleEliminationBracket
          matches={libraryMatches}
          matchComponent={matchComponent}
          options={options}
        />
      </ResponsiveScale>
    );
  }

  // Double elimination
  const wRounds = bracket.rounds_winners;
  const lRounds = bracket.rounds_losers;

  const upper: MatchType[] = matches
    .filter(m => m.bracket_side === "winners")
    .map(m => buildMatchType(m, participantMap, winnersLabel(m.round, wRounds)));

  const lower: MatchType[] = [
    ...matches
      .filter(m => m.bracket_side === "losers")
      .map(m => buildMatchType(m, participantMap, `LR${m.round}`)),
    ...matches
      .filter(m => m.bracket_side === "grand_final")
      .map(m => buildMatchType(m, participantMap, "Gran Final")),
  ];

  // The library requires at least one match in each side
  if (upper.length === 0 || lower.length === 0) {
    return <p className="font-body text-sm text-outline">Bracket no disponible aún.</p>;
  }

  void lRounds;

  return (
    <ResponsiveScale>
      <DoubleEliminationBracket
        matches={{ upper, lower }}
        matchComponent={matchComponent}
        options={options}
      />
    </ResponsiveScale>
  );
}

// Wraps the bracket SVG in a container that measures its natural width and
// CSS-scales it down via transform so it fits the parent container. Scale is
// floored at MIN_SCALE — below that the bracket is unreadable, so we fall back
// to horizontal scroll on the wrapper. Height is JS-tracked because a CSS
// transform doesn't change the laid-out box; without this the wrapper would
// reserve the full unscaled height and leave a huge whitespace gap below.
//
// Re-runs on container resize + content resize so the bracket re-fits on
// window resize, devtools toggle, fullscreen open/close, etc.
//
// MIN_SCALE was 0.45 — too aggressive for wide double-elim brackets on
// narrow viewports, which forced horizontal scrolling on phones / portrait
// tablets. Lowered to 0.25 so the bracket always fits the container; text
// gets smaller but users can pinch-zoom natively if they need detail. The
// admin's Pantalla completa button (v2.36.7) gives a larger view on demand.
const MIN_SCALE = 0.25;

function ResponsiveScale({ children }: { children: React.ReactNode }) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale]   = useState(1);
  const [boxHeight, setH]   = useState<number | null>(null);

  useEffect(() => {
    const wrap  = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    function recompute() {
      if (!wrap || !inner) return;
      const cw = wrap.clientWidth;
      const iw = inner.scrollWidth;
      const ih = inner.scrollHeight;
      if (cw === 0 || iw === 0) return;
      const fit  = cw / iw;
      const next = Math.max(MIN_SCALE, Math.min(1, fit));
      setScale(next);
      setH(ih * next);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(wrap);
    ro.observe(inner);
    // The lib renders SVG asynchronously after the first paint; one extra tick
    // catches the actual content size once g-loot has measured matches.
    const t = setTimeout(recompute, 60);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full overflow-x-auto"
      style={{ height: boxHeight ?? undefined }}
    >
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: "max-content",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BracketSkeleton() {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40 animate-pulse">
        Cargando bracket…
      </p>
    </div>
  );
}
