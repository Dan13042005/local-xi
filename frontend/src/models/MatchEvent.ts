export type MatchEventType = "GOAL" | "YELLOW" | "RED" | "SUB";

export type MatchEvent = {
  id?: number;              // optional (backend returns it)
  matchId?: number;         // optional in payload; backend sets from URL
  minute: number;
  type: MatchEventType;

  playerId?: number | null;         // scorer / booked / sub ON
  relatedPlayerId?: number | null;  // assist OR sub OFF
  note?: string | null;
};