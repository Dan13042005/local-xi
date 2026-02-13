export type Match = {
  id: number;
  date: string;        // ISO date string yyyy-mm-dd
  opponent: string;
  home: boolean;
  goalsFor: number | null;
  goalsAgainst: number | null;

  // NEW — tells us if a lineup exists
  lineupId?: number | null;
};

