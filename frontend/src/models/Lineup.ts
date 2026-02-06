export type Lineup = {
  id?: number;
  matchId: number;
  formation: string;
  slots: LineupSlot[];
};

export type LineupSlot = {
  slotId: string;
  playerId: number | null;
  isCaptain: boolean;
  rating: number | null;
};

