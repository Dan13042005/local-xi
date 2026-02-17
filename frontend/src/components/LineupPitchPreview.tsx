import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { LineupSlot } from "../models/Lineup";

type RowKey = "ATT" | "AM" | "MID" | "DM" | "DEF" | "GK";
type Lane = "L" | "C" | "R";

function norm(s: string) {
  return (s ?? "").toUpperCase().trim();
}

function slotRow(slotId: string, posLabel: string): RowKey {
  const p = norm(posLabel);

  if (p === "GK") return "GK";
  if (["LB", "LWB", "LCB", "CB", "RCB", "RB", "RWB"].includes(p)) return "DEF";
  if (["CDM", "DM", "LDM", "RDM"].includes(p)) return "DM";
  if (["CAM", "AM", "LAM", "RAM", "LM", "RM"].includes(p)) return "AM";
  if (["CM", "LCM", "RCM"].includes(p)) return "MID";
  if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(p)) return "ATT";

  const id = norm(slotId);
  if (id.startsWith("GK")) return "GK";
  if (id.startsWith("DEF")) return "DEF";
  if (id.startsWith("ATT")) return "ATT";
  if (id.startsWith("MID")) return "MID";

  return "MID";
}

function slotLane(posLabel: string): Lane {
  const p = norm(posLabel);

  if (
    p.startsWith("L") ||
    ["LB", "LWB", "LCB", "LM", "LDM", "LAM", "LW", "LF"].includes(p)
  )
    return "L";

  if (
    p.startsWith("R") ||
    ["RB", "RWB", "RCB", "RM", "RDM", "RAM", "RW", "RF"].includes(p)
  )
    return "R";

  return "C";
}

type Props = {
  formation: Formation;
  slots: LineupSlot[];
  players: Player[];

  // click selection (optional, keep if you use it)
  onSlotClick?: (slotId: string) => void;
  selectedSlotId?: string | null;

  // ✅ NEW: drag-drop swap
  onSwapSlots?: (fromSlotId: string, toSlotId: string) => void;
};

export function LineupPitchPreview({
  formation,
  slots,
  players,
  onSlotClick,
  selectedSlotId,
  onSwapSlots,
}: Props) {
  const playerById = new Map(players.map((p) => [p.id, p]));

  const potmSlotId = (() => {
    let best: { slotId: string; rating: number } | null = null;
    for (const s of slots) {
      const r = typeof s.rating === "number" ? s.rating : null;
      if (r == null) continue;
      if (!best || r > best.rating) best = { slotId: s.slotId, rating: r };
    }
    return best?.slotId ?? null;
  })();

  // Keep formation order
  const ordered: LineupSlot[] = [];
  for (const meta of formation.slots ?? []) {
    const s = slots.find((x) => x.slotId === meta.slotId);
    if (s) ordered.push(s);
  }

  const groups: Record<RowKey, Record<Lane, LineupSlot[]>> = {
    ATT: { L: [], C: [], R: [] },
    AM: { L: [], C: [], R: [] },
    MID: { L: [], C: [], R: [] },
    DM: { L: [], C: [], R: [] },
    DEF: { L: [], C: [], R: [] },
    GK: { L: [], C: [], R: [] },
  };

  for (const s of ordered) {
    const label = s.pos ?? "";
    const row = slotRow(s.slotId, label);
    const lane = slotLane(label);
    groups[row][lane].push(s);
  }

  // row positions on the pitch
  const yForRow: Record<RowKey, number> = {
    ATT: 14,
    AM: 28,
    MID: 44,
    DM: 60,
    DEF: 76,
    GK: 90,
  };

  const laneX: Record<Lane, number> = { L: 18, C: 50, R: 82 };

  function spreadX(base: number, idx: number, count: number) {
    if (count <= 1) return base;
    const spread = 22;
    const start = base - spread / 2;
    const step = spread / (count - 1);
    return start + idx * step;
  }

  const placements: Array<{ slot: LineupSlot; xPct: number; yPct: number }> = [];
  (["ATT", "AM", "MID", "DM", "DEF", "GK"] as RowKey[]).forEach((row) => {
    (["L", "C", "R"] as Lane[]).forEach((lane) => {
      const arr = groups[row][lane];
      const base = laneX[lane];
      const y = yForRow[row];
      arr.forEach((slot, i) =>
        placements.push({ slot, xPct: spreadX(base, i, arr.length), yPct: y })
      );
    });
  });

  function labelFor(slot: LineupSlot) {
    if (slot.playerId == null) return slot.pos || "—";
    const p = playerById.get(slot.playerId);
    return p ? `Player #${p.number}` : `Player #${slot.playerId}`;
  }

  function PlayerPill({ slot }: { slot: LineupSlot }) {
    const label = labelFor(slot);
    const pos = slot.pos ?? "";
    const r = typeof slot.rating === "number" ? slot.rating : null;

    const isPotm = potmSlotId != null && slot.slotId === potmSlotId && r != null;
    const isSelected = selectedSlotId != null && slot.slotId === selectedSlotId;

    const draggableEnabled = !!onSwapSlots;

    return (
      <button
        type="button"
        onClick={() => onSlotClick?.(slot.slotId)}
        draggable={draggableEnabled}
        onDragStart={(e) => {
          if (!onSwapSlots) return;
          e.dataTransfer.setData("text/plain", slot.slotId);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (!onSwapSlots) return;
          e.preventDefault(); // allow drop
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          if (!onSwapSlots) return;
          e.preventDefault();
          const fromSlotId = e.dataTransfer.getData("text/plain");
          const toSlotId = slot.slotId;

          if (!fromSlotId || fromSlotId === toSlotId) return;
          onSwapSlots(fromSlotId, toSlotId);
        }}
        style={{
          width: 170,
          padding: "10px 12px",
          borderRadius: 999,
          background: "#fff",
          cursor: onSlotClick || onSwapSlots ? "pointer" : "default",
          border: isSelected
            ? "3px solid #4f46e5"
            : isPotm
            ? "2px solid #ff9900"
            : "1px solid rgba(0,0,0,0.22)",
          boxShadow: isSelected
            ? "0 8px 18px rgba(79,70,229,0.25)"
            : isPotm
            ? "0 6px 16px rgba(255,153,0,0.25)"
            : "0 6px 14px rgba(0,0,0,0.10)",
          textAlign: "center",
          position: "relative",
          userSelect: "none",
        }}
        title={draggableEnabled ? `${label} (drag to swap)` : label}
      >
        {isPotm ? (
          <div
            style={{
              position: "absolute",
              top: -10,
              right: 12,
              background: "#fff3e0",
              border: "1px solid #ffcc80",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 12,
              fontWeight: 800,
              color: "#7a4a00",
            }}
          >
            🔥 POTM
          </div>
        ) : null}

        <div style={{ fontWeight: 800, fontSize: 14 }}>
          {label}
          {slot.isCaptain ? " (C)" : ""}
        </div>

        <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8 }}>
          {pos || "—"}
          {r != null ? (
            <>
              {" "}
              • ⭐ <span style={{ fontWeight: 700 }}>{r}</span>
            </>
          ) : null}
        </div>
      </button>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Pitch preview</div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: 520,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.12)",
          background: "linear-gradient(180deg, rgba(46,139,87,0.20), rgba(46,139,87,0.10))",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: 14,
            border: "2px solid rgba(255,255,255,0.65)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: "50%",
            height: 2,
            background: "rgba(255,255,255,0.65)",
            transform: "translateY(-1px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 120,
            height: 120,
            borderRadius: 999,
            border: "2px solid rgba(255,255,255,0.65)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {placements.map(({ slot, xPct, yPct }) => (
          <div
            key={slot.slotId}
            style={{
              position: "absolute",
              left: `${xPct}%`,
              top: `${yPct}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <PlayerPill slot={slot} />
          </div>
        ))}
      </div>
    </div>
  );
}








