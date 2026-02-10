// frontend/src/models/Formation.ts
export type FormationSlot = {
  position: string;      // "GK", "LB", "CB", etc
  playerId: number | null;
};

export type Formation = {
  id: number;
  name: string;
  shape: string;         // e.g. "4-4-2"
  slots: FormationSlot[];
};



