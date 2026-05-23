// Auto-podium derivation. Given a completed bracket's matches + participants,
// returns the 1st/2nd/3rd user_profile_ids that the bracket implies.
//
// Pure function — kept independent of the Supabase client so the result can be
// unit-tested against any hand-built match topology.
//
// Format rules
// ────────────
// • Single elimination — 1st = winner of the final, 2nd = loser of the final.
//   No canonical 3rd: the two semifinalists are tied, and admin should pick
//   manually (or a 3rd-place match needs to exist, which our generator
//   doesn't currently produce). So we return only positions 1 and 2.
// • Double elimination — 1st = winner of the grand_final, 2nd = loser of the
//   grand_final, 3rd = loser of the last losers-bracket match (the match
//   immediately before the grand_final).
//
// Manual-override contract — admin can override any podium position at any
// time via `POST /api/admin/tournament-results`. The bracket route uses
// `ignoreDuplicates: true` when upserting, so an entry the admin already set
// is never overwritten by auto-derivation.

export interface PodiumMatch {
  id:             number;
  bracket_side:   "winners" | "losers" | "grand_final" | "gf_reset" | string;
  round:          number;
  winner_id:      number | null;   // FK → bracket_participants.id
  loser_id:       number | null;
  next_match_id:  number | null;
  state:          string;
}

export interface PodiumParticipant {
  id:              number;          // bracket_participants.id
  user_profile_id: number | null;   // null = placeholder (TBD / display-only)
}

export interface PodiumEntry {
  position:        1 | 2 | 3;
  userProfileId:   number;
}

/**
 * Derives the podium from a completed bracket.
 *
 * @returns array of {position, userProfileId}. Positions are only included
 *          when both the bracket data + a real (non-null) `user_profile_id`
 *          on that participant exist. So a placeholder seat never produces a
 *          podium entry.
 */
export function derivePodium(
  format:       "single_elimination" | "double_elimination",
  matches:      PodiumMatch[],
  participants: PodiumParticipant[],
): PodiumEntry[] {
  const profileOf = new Map<number, number | null>();
  participants.forEach(p => profileOf.set(p.id, p.user_profile_id));

  // Only completed matches contribute to the podium.
  const done = matches.filter(m => m.state === "completed");

  // The final-final match is the one with no downstream pointer ON the side
  // that produces the champion:
  //   single_elimination → winners side, highest round
  //   double_elimination → grand_final side, highest round
  const finalSide = format === "double_elimination" ? "grand_final" : "winners";
  const finalCandidates = done
    .filter(m => m.bracket_side === finalSide && m.next_match_id === null);
  const final = finalCandidates.length > 0
    ? finalCandidates.reduce((a, b) => (a.round >= b.round ? a : b))
    : null;

  const result: PodiumEntry[] = [];
  if (final?.winner_id) {
    const pid = profileOf.get(final.winner_id);
    if (pid != null) result.push({ position: 1, userProfileId: pid });
  }
  if (final?.loser_id) {
    const pid = profileOf.get(final.loser_id);
    if (pid != null) result.push({ position: 2, userProfileId: pid });
  }

  if (format === "double_elimination") {
    // Third = loser of the last losers-bracket match. In DE that's the
    // match feeding the grand_final from the losers side — the losers
    // match with the highest round number.
    const losers = done.filter(m => m.bracket_side === "losers");
    if (losers.length > 0) {
      const losersFinal = losers.reduce((a, b) => (a.round >= b.round ? a : b));
      if (losersFinal.loser_id) {
        const pid = profileOf.get(losersFinal.loser_id);
        if (pid != null) result.push({ position: 3, userProfileId: pid });
      }
    }
  }
  // Single elimination has no canonical 3rd — left empty for admin override.

  return result;
}
