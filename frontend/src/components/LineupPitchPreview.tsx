import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { LineupSlot } from "../models/Lineup";

type LineKey = "ATT" | "AM" | "MID" | "DM" | "DEF" | "GK";
type Lane = "L" | "C" | "R";

function normalizePos(pos: string) {
  return pos.toUpperCase().trim();
}

function guessLine(posRaw: string): LineKey {
  const p = normalizePos(posRaw);

  if (p === "GK") return "GK";

  if (["LB", "LWB", "LCB", "CB", "RCB", "RB", "RWB"].includes(p)) return "DEF";

  if (["CDM", "DM", "LDM", "RDM"].includes(p)) return "DM";

  // ✅ LM/RM treated as AM (your requirement)
  if (["CAM", "AM", "LAM", "RAM", "LM", "RM"].includes(p)) return "AM";

  if (["CM", "LCM", "RCM"].includes(p)) return "MID";

  if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(p)) return "ATT";

  return "MID";
}

function guessLane(posRaw: string): Lane {
  const p = normalizePos(posRaw);

  // Left lane
  if (
    p.startsWith("L") ||
    ["LB", "LWB", "LCB", "LM", "LDM", "LAM", "LW", "LF"].includes(p)
  )
    return "L";

  // Right lane
  if (
    p.startsWith("R") ||
    ["RB", "RWB", "RCB", "RM", "RDM", "RAM", "RW", "RF"].includes(p)
  )
    return "R";

  return "C";
}

function lineTitle(line: LineKey) {
  switch (line) {
    case "ATT":
      return "Attack";
    case "AM":
      return "Attacking Midfield";
    case "MID":
      return "Midfield";
    case "DM":
      return "Defensive Midfield";
    case "DEF":
      return "Defence";
    case "GK":
      return "Goalkeeper";
  }
}

type Props = {
  formation: Formation;
  slots: LineupSlot[];
  players: Player[];
};

export function LineupPitchPreview({ formation, slots, players }: Props) {
  const playerById = new Map(players.map((p) => [p.id, p]));

  // group by line -> lane
  const groups: Record<LineKey, { L: LineupSlot[]; C: LineupSlot[]; R: LineupSlot[] }> = {
    ATT: { L: [], C: [], R: [] },
    AM: { L: [], C: [], R: [] },
    MID: { L: [], C: [], R: [] },
    DM: { L: [], C: [], R: [] },
    DEF: { L: [], C: [], R: [] },
    GK: { L: [], C: [], R: [] },
  };

  // Keep the formation’s slot order as the “source of truth”
  for (const meta of formation.slots ?? []) {
    const s = slots.find((x) => x.slotId === meta.slotId);
    if (!s) continue;

    const line = guessLine(s.pos ?? meta.position);
    const lane = guessLane(s.pos ?? meta.position);
    groups[line][lane].push(s);
  }

  const lines: LineKey[] = ["ATT", "AM", "MID", "DM", "DEF", "GK"];

  function pillText(s: LineupSlot) {
    if (s.playerId == null) return s.pos; // show label if unassigned
    const p = playerById.get(s.playerId);
    if (!p) return `Player #${s.playerId}`;
    return `#${p.number} ${p.name}`;
  }

  function Pill({ slot }: { slot: LineupSlot }) {
    return (
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: 999,
          padding: "6px 12px",
          minWidth: 90,
          textAlign: "center",
          background: "#fff",
          fontSize: 13,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={pillText(slot)}
      >
        {pillText(slot)}
        {slot.isCaptain ? " (C)" : ""}
      </div>
    );
  }

  function LaneRow({ items, justify }: { items: LineupSlot[]; justify: "flex-start" | "center" | "flex-end" }) {
    if (items.length === 0) return null;

    return (
      <div style={{ display: "flex", justifyContent: justify, gap: 10, flexWrap: "wrap" }}>
        {items.map((s) => (
          <Pill key={s.slotId} slot={s} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Pitch preview</div>

      <div
        style={{
          display: "grid",
          gap: 14,
          padding: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 14,
          background: "rgba(0,0,0,0.02)",
        }}
      >
        {lines.map((line) => {
          const L = groups[line].L;
          const C = groups[line].C;
          const R = groups[line].R;
          const count = L.length + C.length + R.length;

          return (
            <div key={line}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{lineTitle(line)}</div>

              <div
                style={{
                  border: "1px dashed rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: "10px 10px",
                  display: "grid",
                  gap: 8,
                }}
              >
                {count === 0 ? (
                  <div style={{ textAlign: "center", opacity: 0.6, fontSize: 13 }}>No slots</div>
                ) : (
                  <>
                    {/* ✅ Left lane hugs left, right hugs right */}
                    <LaneRow items={L} justify="flex-start" />
                    <LaneRow items={C} justify="center" />
                    <LaneRow items={R} justify="flex-end" />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
