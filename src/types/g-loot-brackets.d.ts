// Type shim for @g-loot/react-tournament-brackets.
// The package.json "types" field points to dist/index.d.ts which doesn't exist;
// this file re-declares the public API from dist/esm/types.d.ts.

declare module "@g-loot/react-tournament-brackets" {
  import type React from "react";

  export type ParticipantType = {
    id: string | number;
    isWinner?: boolean;
    name?: string;
    status?: "PLAYED" | "NO_SHOW" | "WALK_OVER" | "NO_PARTY" | string | null;
    resultText?: string | null;
    [key: string]: unknown;
  };

  export type MatchType = {
    id: number | string;
    href?: string;
    name?: string;
    nextMatchId: number | string | null;
    nextLooserMatchId?: number | string;
    tournamentRoundText?: string;
    startTime: string;
    state: "PLAYED" | "NO_SHOW" | "WALK_OVER" | "NO_PARTY" | string;
    participants: ParticipantType[];
    [key: string]: unknown;
  };

  export type OptionsType = {
    width?: number;
    boxHeight?: number;
    canvasPadding?: number;
    spaceBetweenColumns?: number;
    spaceBetweenRows?: number;
    connectorColor?: string;
    connectorColorHighlight?: string;
    roundHeader?: {
      isShown?: boolean;
      height?: number;
      marginBottom?: number;
      fontSize?: number;
      fontColor?: string;
      backgroundColor?: string;
      fontFamily?: string;
      roundTextGenerator?: (currentRound: number, total: number) => string | undefined;
    };
    roundSeparatorWidth?: number;
    lineInfo?: { separation?: number; homeVisitorSpread?: number };
    horizontalOffset?: number;
    wonBywalkOverText?: string;
    lostByNoShowText?: string;
  };

  export type MatchComponentProps = {
    match: MatchType;
    onMatchClick: (args: {
      match: MatchType;
      topWon: boolean;
      bottomWon: boolean;
      event: React.MouseEvent<HTMLAnchorElement, MouseEvent>;
    }) => void;
    onPartyClick: (party: ParticipantType, partyWon: boolean) => void;
    onMouseEnter: (partyId: string | number) => void;
    onMouseLeave: () => void;
    topParty: ParticipantType;
    bottomParty: ParticipantType;
    topWon: boolean;
    bottomWon: boolean;
    topHovered: boolean;
    bottomHovered: boolean;
    topText: string;
    bottomText: string;
    connectorColor?: string;
    computedStyles?: OptionsType;
    teamNameFallback: string;
    resultFallback: (participant: ParticipantType) => string;
  };

  export type SingleElimLeaderboardProps = {
    matches: MatchType[];
    matchComponent: (props: MatchComponentProps) => React.ReactElement;
    currentRound?: string;
    onMatchClick?: (args: { match: MatchType; topWon: boolean; bottomWon: boolean }) => void;
    onPartyClick?: (party: ParticipantType, partyWon: boolean) => void;
    options?: { style: OptionsType };
    theme?: Record<string, unknown>;
    svgWrapper?: (props: { bracketWidth: number; bracketHeight: number; startAt: number[]; children: React.ReactElement }) => React.ReactElement;
  };

  export type DoubleElimLeaderboardProps = {
    matches: { upper: MatchType[]; lower: MatchType[] };
    matchComponent: (props: MatchComponentProps) => React.ReactElement;
    currentRound?: string;
    onMatchClick?: (args: { match: MatchType; topWon: boolean; bottomWon: boolean }) => void;
    onPartyClick?: (party: ParticipantType, partyWon: boolean) => void;
    options?: { style: OptionsType };
    theme?: Record<string, unknown>;
    svgWrapper?: (props: { bracketWidth: number; bracketHeight: number; startAt: number[]; children: React.ReactElement }) => React.ReactElement;
  };

  export declare const SingleEliminationBracket: (props: SingleElimLeaderboardProps) => React.ReactElement;
  export declare const DoubleEliminationBracket: (props: DoubleElimLeaderboardProps) => React.ReactElement;
  export declare const Match: (props: MatchComponentProps) => React.ReactElement;
  export declare const SVGViewer: (props: Record<string, unknown>) => React.ReactElement;
  export declare const MATCH_STATES: Record<string, string>;
  export declare function createTheme(overrides?: Record<string, unknown>): Record<string, unknown>;
}
