// frontend/src/models/Lineup.ts

export type PlayerMatchStat = {
  playerId: number;
  goals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
};

export type LineupSlot = {
  slotId: string;
  pos: string;
  playerId: number | null;
  isCaptain: boolean;
  rating: number | null;

  /**
   * Optional display fields.
   * These exist so components like LineupPitchPreview can read slot.goals etc.
   * In Option 1, the source of truth is Lineup.playerStats (by playerId).
   */
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
};

export type Lineup = {
  matchId: number;
  formationId: number;
  slots: LineupSlot[];

  /**
   * Option 1: stats stored separately from slots (stick to player).
   */
  playerStats?: PlayerMatchStat[];
};




