// frontend/src/models/Lineup.ts

export type LineupSlot = {
  slotId: string;              // stable id from FormationSlot.slotId
  pos: string;                 // label shown in UI (from FormationSlot.position)
  playerId: number | null;
  isCaptain: boolean;
  rating: number | null;
};

export type Lineup = {
  id?: number;
  matchId: number;
  formationId: number;         // ✅ formation reference by DB id
  captainPlayerId?: number | null;
  slots: LineupSlot[];
};




