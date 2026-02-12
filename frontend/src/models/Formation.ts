export type FormationSlot = {
  slotId: string;          // ✅ stable id, e.g. "MID-2"
  position: string;        // label shown in UI, e.g. "GK", "LB", "CM"
  playerId: number | null; // optional (can be unused for now)
};

export type Formation = {
  id: number;
  name: string;
  shape: string; // e.g. "4-4-2"
  slots: FormationSlot[];
};




