// frontend/src/models/Lineup.ts

export type LineupSlot = {
  slotId: string;
  pos: string;
  playerId: number | null;
  isCaptain: boolean;
  rating: number | null;

  // ✅ NEW (per-match stats)
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
};


export type Lineup = {
  id?: number;
  matchId: number;
  formationId: number;         // ✅ formation reference by DB id
  captainPlayerId?: number | null;
  slots: LineupSlot[];
};




