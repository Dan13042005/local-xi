// frontend/src/models/Formation.ts

export type FormationSlot = {
  position: string;           // "GK", "LB", "CB", etc (editable label)
  playerId: number | null;    // not used for formations yet, but your backend has it
  slotId: string;             // stable id used by lineup slots, e.g. "DEF-1"
};

export type Formation = {
  id: number;
  name: string;
  shape: string;              // e.g. "4-4-2"
  slots: FormationSlot[];
};





