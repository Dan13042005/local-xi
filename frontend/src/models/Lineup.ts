export type Lineup = {
  id?: number;
  matchId: number;
  formationId: number;          // ✅ backend expects this
  captainPlayerId?: number | null;
  slots: LineupSlot[];
};

export type LineupSlot = {
  slotId: string;
  pos: string;                  // ✅ required by backend
  playerId: number | null;
  isCaptain: boolean;
  rating: number | null;
};


