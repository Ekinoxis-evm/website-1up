// Player-centric match resolution — shared by Copa (bracket) and Liga (league)
// so the "Mi partido" / "Ronda" views work identically for both formats. Pure
// functions kept independent of Supabase so they can be unit-tested against any
// normalized match set.
//
// Both bracket_matches and league_matches are normalized into PlayerMatch before
// calling these — the caller maps its rows once, the engine stays format-agnostic.

export type PlayerMatch = {
  id:          number;
  round:       number;
  matchNumber: number;
  p1Id:        number | null;
  p2Id:        number | null;
  state:       string; // pending | ready | in_progress | completed | bye
};

export type PlayerParticipant = {
  id:             number;          // bracket_participants.id | league_participants.id
  userProfileId:  number | null;
};

// Resolve which participant row belongs to the logged-in user in this tournament.
export function findMyParticipant(
  participants: PlayerParticipant[],
  userProfileId: number | null,
): PlayerParticipant | null {
  if (userProfileId == null) return null;
  return participants.find(p => p.userProfileId === userProfileId) ?? null;
}

function orderKey(m: PlayerMatch): number {
  // Global order across rounds — round dominates, then match number.
  return m.round * 10_000 + m.matchNumber;
}

// The match the player should see first:
//   1. an in_progress match they're in (the game being played now)
//   2. else their next playable match (ready → pending) by (round, matchNumber)
//   3. else their most recent completed match (season/run is over for them)
// Returns null if the player has no matches at all.
export function resolveMyMatch<T extends PlayerMatch>(
  matches: T[],
  myParticipantId: number | null,
): T | null {
  if (myParticipantId == null) return null;
  const mine = matches.filter(m => m.p1Id === myParticipantId || m.p2Id === myParticipantId);
  if (mine.length === 0) return null;

  const inProgress = mine.filter(m => m.state === "in_progress").sort((a, b) => orderKey(a) - orderKey(b));
  if (inProgress.length > 0) return inProgress[0];

  const upcoming = mine
    .filter(m => m.state === "ready" || m.state === "pending")
    .sort((a, b) => orderKey(a) - orderKey(b));
  if (upcoming.length > 0) return upcoming[0];

  // All done — show the latest they played.
  const played = mine
    .filter(m => m.state === "completed" || m.state === "bye")
    .sort((a, b) => orderKey(b) - orderKey(a));
  return played[0] ?? mine[0];
}

// The active round of the whole tournament: the lowest round that still has an
// unfinished (non-completed, non-bye) match. If everything is done, the max round.
export function currentRound(matches: PlayerMatch[]): number {
  if (matches.length === 0) return 0;
  const unfinished = matches.filter(m => m.state !== "completed" && m.state !== "bye");
  if (unfinished.length > 0) return Math.min(...unfinished.map(m => m.round));
  return Math.max(...matches.map(m => m.round));
}

export function matchesForRound<T extends PlayerMatch>(matches: T[], round: number): T[] {
  return matches
    .filter(m => m.round === round)
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

export function isMyMatch(m: PlayerMatch, myParticipantId: number | null): boolean {
  if (myParticipantId == null) return false;
  return m.p1Id === myParticipantId || m.p2Id === myParticipantId;
}
