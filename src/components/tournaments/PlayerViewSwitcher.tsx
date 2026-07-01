"use client";

// Player-centric view switcher for a tournament — Mi partido / Ronda / Completo —
// reusable for Copa (bracket) and Liga (league). Default on mobile = Mi partido.
//
// The server passes the already-public participants + matches (normalized) and the
// "Completo" view (bracket or standings) as children. This client component resolves
// the logged-in player's participant via /api/user/profile and renders their match.

import { useState, useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { goToLogin } from "@/lib/loginRedirect";
import { MatchVsCard, type MatchSide } from "@/components/tournaments/MatchVsCard";
import {
  findMyParticipant, resolveMyMatch, currentRound, matchesForRound, isMyMatch,
  type PlayerMatch,
} from "@/lib/tournaments/playerMatch";

export type SwitcherParticipant = { id: number; displayName: string; avatarUrl: string | null; userProfileId: number | null };
export type SwitcherMatch = PlayerMatch & { p1Score: number | null; p2Score: number | null; winnerId: number | null };

type View = "mine" | "round" | "full";

export function PlayerViewSwitcher({
  participants, matches, children,
}: {
  participants: SwitcherParticipant[];
  matches:      SwitcherMatch[];
  children:     React.ReactNode; // the "Completo" view (bracket / standings)
}) {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const [view, setView] = useState<View>("full");
  const [viewTouched, setViewTouched] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok || cancelled) return;
        const profile = await res.json();
        if (!cancelled) setMyProfileId(profile?.id ?? null);
      } catch { /* ignore — falls back to Completo */ }
    })();
    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken]);

  const nameById = useMemo(() => new Map(participants.map(p => [p.id, p])), [participants]);
  const myParticipant = useMemo(() => findMyParticipant(participants, myProfileId), [participants, myProfileId]);
  const myParticipantId = myParticipant?.id ?? null;
  const myMatch = useMemo(() => resolveMyMatch(matches, myParticipantId), [matches, myParticipantId]);
  const activeRound = useMemo(() => currentRound(matches), [matches]);
  const roundMatches = useMemo(() => matchesForRound(matches, myMatch?.round ?? activeRound), [matches, myMatch, activeRound]);

  const isPlayer = myParticipantId != null;

  // Default to "Mi partido" once we know the user is a player (unless they picked a view).
  useEffect(() => {
    if (!viewTouched && isPlayer && myMatch) setView("mine");
  }, [viewTouched, isPlayer, myMatch]);

  function side(id: number | null): MatchSide {
    if (id == null) return null;
    const p = nameById.get(id);
    return p ? { name: p.displayName, avatarUrl: p.avatarUrl } : null;
  }
  function winnerSide(m: SwitcherMatch): 1 | 2 | null {
    if (m.winnerId == null) return null;
    return m.winnerId === m.p1Id ? 1 : m.winnerId === m.p2Id ? 2 : null;
  }

  function pick(v: View) { setView(v); setViewTouched(true); }

  const tabs: { id: View; label: string }[] = [
    ...(isPlayer ? [{ id: "mine" as const, label: "Mi partido" }, { id: "round" as const, label: "Ronda" }] : []),
    { id: "full", label: "Completo" },
  ];

  return (
    <div>
      {/* Switcher — only shown when the viewer is a player; otherwise just Completo. */}
      {isPlayer && (
        <div className="flex items-center gap-1 mb-4" role="tablist">
          {tabs.map(t => {
            const active = view === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => pick(t.id)}
                className={`px-4 py-2 font-headline font-black text-xs uppercase tracking-tight transition-colors ${
                  active ? "bg-primary-container text-white" : "bg-surface-container text-outline hover:text-on-surface"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Login nudge for logged-out visitors — via goToLogin (never inline Privy on a public page). */}
      {ready && !authenticated && (
        <button
          onClick={() => goToLogin()}
          className="mb-4 font-headline font-bold text-[11px] uppercase tracking-widest text-secondary hover:underline"
        >
          Inicia sesión para ver tu partido →
        </button>
      )}

      {view === "mine" && isPlayer && (
        myMatch ? (
          <MatchVsCard
            p1={side(myMatch.p1Id)} p2={side(myMatch.p2Id)}
            p1Score={myMatch.p1Score} p2Score={myMatch.p2Score}
            state={myMatch.state} winnerSide={winnerSide(myMatch)} isDraw={myMatch.winnerId == null && myMatch.state === "completed"}
            size="lg" highlight
          />
        ) : (
          <p className="font-body text-sm text-on-surface-variant bg-surface-container p-4">Aún no tienes un partido asignado.</p>
        )
      )}

      {view === "round" && isPlayer && (
        <div className="space-y-2">
          <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">
            Ronda {myMatch?.round ?? activeRound}
          </p>
          {roundMatches.map(rm => (
            <MatchVsCard
              key={rm.id}
              p1={side(rm.p1Id)} p2={side(rm.p2Id)}
              p1Score={rm.p1Score} p2Score={rm.p2Score}
              state={rm.state} winnerSide={winnerSide(rm)} isDraw={rm.winnerId == null && rm.state === "completed"}
              highlight={isMyMatch(rm, myParticipantId)}
            />
          ))}
        </div>
      )}

      {/* Completo — the server-rendered bracket / standings. Hidden (not unmounted) so
         its internal state (pan/zoom) survives switching. */}
      <div className={view === "full" ? "" : "hidden"}>{children}</div>
    </div>
  );
}
