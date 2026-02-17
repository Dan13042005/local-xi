import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { LineupSlot } from "../models/Lineup";

type LineKey = "ATT" | "AM" | "MID" | "DM" | "DEF" | "GK";
type Lane = "L" | "C" | "R";

function normalizePos(pos: string) {
  return (pos ?? "").toUpperCase().trim();
}

function guessLine(posRaw: string): LineKey {
  const p = normalizePos(posRaw);

  if (p === "GK") return "GK";
  if (["LB", "LWB", "LCB", "CB", "RCB", "RB", "RWB"].includes(p)) return "DEF";
  if (["CDM", "DM", "LDM", "RDM"].includes(p)) return "DM";

  // LM/RM treated as AM
  if (["CAM", "AM", "LAM", "RAM", "LM", "RM"].includes(p)) return "AM";

  if (["CM", "LCM", "RCM"].includes(p)) return "MID";
  if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(p)) return "ATT";

  return "MID";
}

function guessLane(posRaw: string): Lane {
  const p = normalizePos(posRaw);

  if (["LM", "LW", "LB", "LWB", "LCB", "LDM", "LAM", "LF"].includes(p) || p.startsWith("L"))
    return "L";

  if (["RM", "RW", "RB", "RWB", "RCB", "RDM", "RAM", "RF"].includes(p) || p.startsWith("R"))
    return "R";

  return "C";
}

type Props = {
  formation: Formation;
  slots: LineupSlot[];
  players: Player[];
};

type PositionedSlot = {
  slot: LineupSlot;
  xPct: number;
  yPct: number;
  label: string;
  posLabel: string;
};

export function LineupPitchPreview({ formation, slots, players }: Props) {
  const playerById = new Map(players.map((p) => [p.id, p]));

  // 🔥 POTM = highest rating among assigned players
  const potmSlotId = (() => {
    const rated = slots
      .filter((s) => s.playerId != null && s.rating != null)
      .slice()
      .sort((a, b) => {
        // rating desc
        const r = (b.rating ?? -999) - (a.rating ?? -999);
        if (r !== 0) return r;

        // captain breaks ties
        if (a.isCaptain !== b.isCaptain) return a.isCaptain ? 1 : -1;

        // stable fallback
        return String(a.slotId).localeCompare(String(b.slotId));
      });

    return rated[0]?.slotId ?? null;
  })();

  // group by line -> lane (formation order)
  const groups: Record<LineKey, { L: LineupSlot[]; C: LineupSlot[]; R: LineupSlot[] }> = {
    ATT: { L: [], C: [], R: [] },
    AM: { L: [], C: [], R: [] },
    MID: { L: [], C: [], R: [] },
    DM: { L: [], C: [], R: [] },
    DEF: { L: [], C: [], R: [] },
    GK: { L: [], C: [], R: [] },
  };

  for (const meta of formation.slots ?? []) {
    const s = slots.find((x) => x.slotId === meta.slotId);
    if (!s) continue;

    const label = (s.pos ?? meta.position ?? "").trim();
    const line = guessLine(label);
    const lane = guessLane(label);
    groups[line][lane].push(s);
  }

  // vertical line positions
  const yByLine: Record<LineKey, number> = {
    ATT: 10,
    AM: 28,
    MID: 46,
    DM: 64,
    DEF: 82,
    GK: 94,
  };

  // lane anchors (LM/LW left, RM/RW right)
  const xByLane: Record<Lane, number> = { L: 14, C: 50, R: 86 };

  function jitterX(base: number, idx: number, total: number) {
    if (total <= 1) return base;
    const spread = 18;
    const step = spread / (total - 1);
    const start = base - spread / 2;
    const x = start + idx * step;
    return Math.max(6, Math.min(94, x));
  }

  function playerNameFor(slot: LineupSlot) {
    if (slot.playerId == null) return slot.pos;
    const p = playerById.get(slot.playerId);
    if (!p) return `Player #${slot.playerId}`;
    return `#${p.number} ${p.name}`;
  }

  const positioned: PositionedSlot[] = [];
  const lines: LineKey[] = ["ATT", "AM", "MID", "DM", "DEF", "GK"];

  for (const line of lines) {
    (["L", "C", "R"] as Lane[]).forEach((lane) => {
      const items = groups[line][lane];
      const baseX = xByLane[lane];
      const y = yByLine[line];

      items.forEach((slot, idx) => {
        positioned.push({
          slot,
          xPct: jitterX(baseX, idx, items.length),
          yPct: y,
          label: playerNameFor(slot),
          posLabel: (slot.pos ?? "").trim(),
        });
      });
    });
  }

  function Pill({ ps }: { ps: PositionedSlot }) {
    const { slot, label } = ps;
    const isPotm = potmSlotId != null && slot.slotId === potmSlotId;

    return (
      <div
        style={{
          position: "absolute",
          left: `${ps.xPct}%`,
          top: `${ps.yPct}%`,
          transform: "translate(-50%, -50%)",
          border: isPotm ? "2px solid rgba(255,165,0,0.95)" : "1px solid rgba(0,0,0,0.25)",
          borderRadius: 999,
          padding: "8px 12px",
          minWidth: 140,
          maxWidth: 190,
          textAlign: "center",
          background: "#fff",
          boxShadow: isPotm
            ? "0 0 0 4px rgba(255,165,0,0.18), 0 4px 10px rgba(0,0,0,0.12)"
            : "0 2px 6px rgba(0,0,0,0.08)",
          fontSize: 13,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={label}
      >
        {isPotm ? (
          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(255,165,0,0.18)",
              border: "1px solid rgba(255,165,0,0.55)",
              marginBottom: 6,
            }}
          >
            🔥 POTM
          </div>
        ) : null}

        <div style={{ fontWeight: 600 }}>
          {label}
          {slot.isCaptain ? " (C)" : ""}
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {ps.posLabel || "—"}
          {slot.rating != null ? ` • ⭐ ${slot.rating}` : ""}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Pitch preview</div>

      <div
        style={{
          position: "relative",
          height: 520,
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.15)",
          background: "linear-gradient(rgba(0,0,0,0.02), rgba(0,0,0,0.01))",
          overflow: "hidden",
        }}
      >
        {/* pitch markings */}
        <div
          style={{
            position: "absolute",
            inset: 12,
            border: "2px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: "50%",
            height: 2,
            background: "rgba(0,0,0,0.10)",
            transform: "translateY(-1px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 90,
            height: 90,
            borderRadius: 999,
            border: "2px solid rgba(0,0,0,0.10)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {positioned.length === 0 ? (
          <div style={{ padding: 16, opacity: 0.7 }}>
            No slots to display — create a formation first.
          </div>
        ) : (
          positioned.map((ps) => <Pill key={ps.slot.slotId} ps={ps} />)
        )}
      </div>
    </div>
  );
}



