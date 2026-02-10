export type FormationName = "4-4-2" | "4-3-3" | "4-2-3-1";

export type FormationSlotPreset = {
  pos: string;     // label shown in UI
  slotId: string;  // stable id used by lineup slots
};

export const FORMATIONS: Record<FormationName, { name: FormationName; slots: FormationSlotPreset[] }> = {
  "4-4-2": {
    name: "4-4-2",
    slots: [
      { pos: "GK", slotId: "GK-1" },

      { pos: "LB", slotId: "DEF-1" },
      { pos: "CB", slotId: "DEF-2" },
      { pos: "CB", slotId: "DEF-3" },
      { pos: "RB", slotId: "DEF-4" },

      { pos: "LM", slotId: "MID-1" },
      { pos: "CM", slotId: "MID-2" },
      { pos: "CM", slotId: "MID-3" },
      { pos: "RM", slotId: "MID-4" },

      { pos: "ST", slotId: "ATT-1" },
      { pos: "ST", slotId: "ATT-2" },
    ],
  },

  "4-3-3": {
    name: "4-3-3",
    slots: [
      { pos: "GK", slotId: "GK-1" },

      { pos: "LB", slotId: "DEF-1" },
      { pos: "CB", slotId: "DEF-2" },
      { pos: "CB", slotId: "DEF-3" },
      { pos: "RB", slotId: "DEF-4" },

      { pos: "CM", slotId: "MID-1" },
      { pos: "CM", slotId: "MID-2" },
      { pos: "CM", slotId: "MID-3" },

      { pos: "LW", slotId: "ATT-1" },
      { pos: "ST", slotId: "ATT-2" },
      { pos: "RW", slotId: "ATT-3" },
    ],
  },

  "4-2-3-1": {
    name: "4-2-3-1",
    slots: [
      { pos: "GK", slotId: "GK-1" },

      { pos: "LB", slotId: "DEF-1" },
      { pos: "CB", slotId: "DEF-2" },
      { pos: "CB", slotId: "DEF-3" },
      { pos: "RB", slotId: "DEF-4" },

      // order you wanted: LM, CDM, CAM, CDM, RM
      { pos: "LM", slotId: "MID-1" },
      { pos: "CDM", slotId: "MID-2" },
      { pos: "CAM", slotId: "MID-3" },
      { pos: "CDM", slotId: "MID-4" },
      { pos: "RM", slotId: "MID-5" },

      { pos: "ST", slotId: "ATT-1" },
    ],
  },
};
