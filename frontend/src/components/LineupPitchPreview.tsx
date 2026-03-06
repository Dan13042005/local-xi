import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { LineupSlot } from "../models/Lineup";
import type { RefObject } from "react";

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
  ) {
    return "L";
  }

  if (
    p.startsWith("R") ||
    ["RB", "RWB", "RCB", "RM", "RDM", "RAM", "RW", "RF"].includes(p)
  ) {
    return "R";
  }

  return "C";
}

type Props = {
  formation: Formation;
  slots: LineupSlot[];
  players: Player[];

  onSlotClick?: (slotId: string) => void;
  selectedSlotId?: string | null;

  onSwapSlots?: (fromSlotId: string, toSlotId: string) => void;
  onDropPlayerToSlot?: (slotId: string, playerId: number) => void;

  exportRef?: RefObject<HTMLDivElement | null>;
};

export function LineupPitchPreview({
  formation,
  slots,
  players,
  onSlotClick,
  selectedSlotId,
  onSwapSlots,
  onDropPlayerToSlot,
  exportRef,
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
        placements.push({
          slot,
          xPct: spreadX(base, i, arr.length),
          yPct: y,
        })
      );
    });
  });

  function labelFor(slot: LineupSlot) {
    if (slot.playerId == null) return slot.pos || "—";

    const p = playerById.get(slot.playerId);
    if (!p) return `#${slot.playerId}`;

    return `${p.name} (#${p.number})`;
  }

  function PlayerPill({ slot }: { slot: LineupSlot }) {
    const label = labelFor(slot);
    const pos = slot.pos ?? "";
    const r = typeof slot.rating === "number" ? slot.rating : null;

    const isPotm = potmSlotId != null && slot.slotId === potmSlotId && r != null;
    const isSelected = selectedSlotId != null && slot.slotId === selectedSlotId;
    const draggableEnabled = !!onSwapSlots;
    const isEmpty = slot.playerId == null;

    const className =
      "pitchPill" +
      (isSelected ? " selected" : "") +
      (isPotm ? " potm" : "") +
      (isEmpty ? " empty" : "");

    return (
      <button
        type="button"
        className={className}
        onClick={() => onSlotClick?.(slot.slotId)}
        draggable={draggableEnabled}
        onDragStart={(e) => {
          if (!onSwapSlots) return;
          e.dataTransfer.setData("text/plain", `slot:${slot.slotId}`);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (!onSwapSlots && !onDropPlayerToSlot) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const data = e.dataTransfer.getData("text/plain") || "";
          const toSlotId = slot.slotId;

          if (data.startsWith("player:")) {
            const idStr = data.replace("player:", "").trim();
            const playerId = Number(idStr);
            if (!Number.isFinite(playerId)) return;
            onDropPlayerToSlot?.(toSlotId, playerId);
            return;
          }

          if (data.startsWith("slot:")) {
            const fromSlotId = data.replace("slot:", "").trim();
            if (!fromSlotId || fromSlotId === toSlotId) return;
            onSwapSlots?.(fromSlotId, toSlotId);
            return;
          }

          if (data && data !== toSlotId) {
            onSwapSlots?.(data, toSlotId);
          }
        }}
        style={{
          width: 138,
          cursor:
            onSlotClick || onSwapSlots || onDropPlayerToSlot ? "pointer" : "default",
        }}
        title={
          onDropPlayerToSlot
            ? `${label} (drop bench player to assign / drag to swap)`
            : draggableEnabled
            ? `${label} (drag to swap)`
            : label
        }
      >
        {isPotm ? <div className="potmBadge">🔥 POTM</div> : null}

        <div className="pillTitle">
          {label}
          {slot.isCaptain ? " (C)" : ""}
        </div>

        {!isEmpty && (
          <div className="pillSub">
            {pos || "—"}
            {r != null ? (
              <>
                {" "}
                • ⭐ <span className="pillRating">{r}</span>
              </>
            ) : null}
          </div>
        )}

        {!isEmpty && (
          <div className="pillStats">
            {(slot.goals ?? 0) > 0 && <span title="Goals">⚽ {slot.goals}</span>}
            {(slot.assists ?? 0) > 0 && <span title="Assists">🅰️ {slot.assists}</span>}
            {(slot.yellowCards ?? 0) > 0 && <span title="Yellow cards">🟨 {slot.yellowCards}</span>}
            {(slot.redCards ?? 0) > 0 && <span title="Red cards">🟥 {slot.redCards}</span>}
          </div>
        )}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Pitch preview</div>

      <div
        ref={exportRef}
        className="pitch"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 720,
          height: 570,
          margin: "0 auto",
        }}
      >
        <div
          className="pitchContent"
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
          }}
        >
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
    </div>
  );
}