export type FormationName = "4-4-2" | "4-3-3" | "4-2-3-1";

export type FormationLine = "GK" | "DEF" | "MID" | "ATT";

export type FormationSlot = {
  line: FormationLine;
  pos: string;    // label shown in UI, e.g. "LB", "CB", "CM", "ST"
  slotId: string; // stable id, e.g. "DEF-1"
};

export type Formation = {
  name: FormationName;
  slots: FormationSlot[];
};

export const FORMATIONS: Record<FormationName, Formation> = {
  "4-4-2": {
    name: "4-4-2",
    slots: [
      { line: "ATT", pos: "ST", slotId: "ATT-1" },
      { line: "ATT", pos: "ST", slotId: "ATT-2" },

      { line: "MID", pos: "LM", slotId: "MID-1" },
      { line: "MID", pos: "CM", slotId: "MID-2" },
      { line: "MID", pos: "CM", slotId: "MID-3" },
      { line: "MID", pos: "RM", slotId: "MID-4" },

      { line: "DEF", pos: "LB", slotId: "DEF-1" },
      { line: "DEF", pos: "CB", slotId: "DEF-2" },
      { line: "DEF", pos: "CB", slotId: "DEF-3" },
      { line: "DEF", pos: "RB", slotId: "DEF-4" },

      { line: "GK", pos: "GK", slotId: "GK-1" },
    ],
  },

  "4-3-3": {
    name: "4-3-3",
    slots: [
      { line: "ATT", pos: "LW", slotId: "ATT-1" },
      { line: "ATT", pos: "ST", slotId: "ATT-2" },
      { line: "ATT", pos: "RW", slotId: "ATT-3" },

      { line: "MID", pos: "CM", slotId: "MID-1" },
      { line: "MID", pos: "CM", slotId: "MID-2" },
      { line: "MID", pos: "CM", slotId: "MID-3" },

      { line: "DEF", pos: "LB", slotId: "DEF-1" },
      { line: "DEF", pos: "CB", slotId: "DEF-2" },
      { line: "DEF", pos: "CB", slotId: "DEF-3" },
      { line: "DEF", pos: "RB", slotId: "DEF-4" },

      { line: "GK", pos: "GK", slotId: "GK-1" },
    ],
  },

  "4-2-3-1": {
    name: "4-2-3-1",
    slots: [
      { line: "ATT", pos: "ST", slotId: "ATT-1" },

      { line: "MID", pos: "LM",  slotId: "MID-1" },
      { line: "MID", pos: "CDM", slotId: "MID-2" },
      { line: "MID", pos: "CAM", slotId: "MID-3" },
      { line: "MID", pos: "CDM", slotId: "MID-4" },
      { line: "MID", pos: "RM",  slotId: "MID-5" },


      { line: "DEF", pos: "LB", slotId: "DEF-1" },
      { line: "DEF", pos: "CB", slotId: "DEF-2" },
      { line: "DEF", pos: "CB", slotId: "DEF-3" },
      { line: "DEF", pos: "RB", slotId: "DEF-4" },

      { line: "GK", pos: "GK", slotId: "GK-1" },
    ],
  },
};


