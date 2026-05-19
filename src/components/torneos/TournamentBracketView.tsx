"use client";

import React from "react";
import dynamic from "next/dynamic";
import type {
  MatchType,
  ParticipantType,
  SingleElimLeaderboardProps,
  DoubleElimLeaderboardProps,
  MatchComponentProps,
} from "@g-loot/react-tournament-brackets";
import type {
  Bracket,
  BracketParticipant,
  BracketMatch,
} from "@/types/database.types";

const SingleEliminationBracket = dynamic<SingleElimLeaderboardProps>(
  () => import("@g-loot/react-tournament-brackets").then(m => ({ default: m.SingleEliminationBracket })),
  { ssr: false, loading: () => <BracketSkeleton /> },
);
const DoubleEliminationBracket = dynamic<DoubleElimLeaderboardProps>(
  () => import("@g-loot/react-tournament-brackets").then(m => ({ default: m.DoubleEliminationBracket })),
  { ssr: false, loading: () => <BracketSkeleton /> },
);
const Match = dynamic<MatchComponentProps>(
  () => import("@g-loot/react-tournament-brackets").then(m => ({ default: m.Match })),
  { ssr: false },
);

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
  const remaining = totalRounds - round;
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semifinal";
  if (remaining === 2) return "Cuartos";
  return `Ronda ${round}`;
}

// ── Transform DB rows into @g-loot MatchType ─────────────────

function buildMatchType(
  match: BracketMatch,
  participantMap: Map<number, BracketParticipant>,
  roundLabel: string,
): MatchType {
  const p1 = match.p1_id ? participantMap.get(match.p1_id) : undefined;
  const p2 = match.p2_id ? participantMap.get(match.p2_id) : undefined;

  const isCompleted = match.state === "completed";

  function toParty(
    participant: BracketParticipant | undefined,
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
    };
  }

  return {
    id:                   match.id,
    nextMatchId:          match.next_match_id ?? null,
    nextLooserMatchId:    match.next_loser_match_id ?? undefined,
    tournamentRoundText:  roundLabel,
    startTime:            match.created_at,
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
  participants: BracketParticipant[];
  matches:      BracketMatch[];
}

interface Props {
  data: BracketData;
}

// ── Component ────────────────────────────────────────────────

export function TournamentBracketView({ data }: Props) {
  const { bracket, participants, matches } = data;

  const participantMap = new Map(participants.map(p => [p.id, p]));

  if (bracket.format === "single_elimination") {
    const wRounds = bracket.rounds_winners;
    const libraryMatches: MatchType[] = matches
      .filter(m => m.bracket_side === "winners")
      .map(m => buildMatchType(m, participantMap, winnersLabel(m.round, wRounds)));

    return (
      <div className="w-full overflow-x-auto">
        <SingleEliminationBracket
          matches={libraryMatches}
          matchComponent={Match as (props: MatchComponentProps) => React.ReactElement}
          options={{ style: { width: 220, boxHeight: 72 } }}
        />
      </div>
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
    <div className="w-full overflow-x-auto">
      <DoubleEliminationBracket
        matches={{ upper, lower }}
        matchComponent={Match as (props: MatchComponentProps) => React.ReactElement}
        options={{ style: { width: 220, boxHeight: 72 } }}
      />
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
