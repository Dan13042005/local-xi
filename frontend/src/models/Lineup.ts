export type LineupSlot = {
  slotId: string;
  pos: string;
  playerId: number | null;
  isCaptain: boolean;
  rating: number | null;
};

export type Lineup = {
  id?: number;
  matchId: number;

  // ✅ backend now expects this
  formationId: number;

  // optional for later
  captainPlayerId?: number | null;

  slots: LineupSlot[];
};



