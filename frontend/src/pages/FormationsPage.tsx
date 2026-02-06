import { useEffect, useMemo, useState } from "react";
import type { Player } from "../models/Players";
import { getPlayers } from "../api/playersAPI";
import { FORMATIONS, type FormationName, type FormationSlot } from "../models/Formation";

type LineKey = FormationSlot["line"];
type Assignments = Record<string, number | null>; // slotId -> playerId

export function FormationsPage() {
  const [selected, setSelected] = useState<FormationName>("4-4-2");

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [error, setError] = useState<string>("");

  const [assignments, setAssignments] = useState<Assignments>({});

  const formation = FORMATIONS[selected];

  // Load players once
  useEffect(() => {
    (async () => {
      try {
        const data = await getPlayers();
        const sorted = [...data].sort((a, b) => a.number - b.number);
        setPlayers(sorted);
      } catch {
        setError("Failed to load players.");
      } finally {
        setLoadingPlayers(false);
      }
    })();
  }, []);

  // Ensure assignments always match current formation slots (when formation changes)
  useEffect(() => {
    const next: Assignments = {};
    for (const slot of formation.slots) {
      next[slot.slotId] = assignments[slot.slotId] ?? null;
    }
    setAssignments(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const grouped = useMemo(() => {
    const lines: Record<LineKey, FormationSlot[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    for (const slot of formation.slots) lines[slot.line].push(slot);

    // ---------- Step 1.5 fix: ensure MID ordering is left-to-right ----------
    // We'll order MID by slotId numeric suffix so you can control the "shape"
    // by ordering slots in Formation.ts. If your MID looks wrong, fix the order
    // in Formation.ts and this will reflect it predictably.
    const sortBySlotId = (a: FormationSlot, b: FormationSlot) => {
      const an = Number(a.slotId.split("-")[1] ?? 0);
      const bn = Number(b.slotId.split("-")[1] ?? 0);
      return an - bn;
    };

    lines.GK.sort(sortBySlotId);
    lines.DEF.sort(sortBySlotId);
    lines.MID.sort(sortBySlotId);
    lines.ATT.sort(sortBySlotId);

    return lines;
  }, [formation]);

  const usedPlayerIds = useMemo(() => {
    return new Set(
      Object.values(assignments)
        .filter((v): v is number => v != null)
    );
  }, [assignments]);

  const assignedCount = useMemo(() => {
    return Object.values(assignments).filter((v) => v != null).length;
  }, [assignments]);

  function assign(slotId: string, playerId: number | null) {
    setError("");

    // If selecting a player already used elsewhere, block it.
    if (playerId != null) {
      for (const [sid, pid] of Object.entries(assignments)) {
        if (sid !== slotId && pid === playerId) {
          setError("That player is already assigned to another slot.");
          return;
        }
      }
    }

    setAssignments((prev) => ({ ...prev, [slotId]: playerId }));
  }

  function clearSlot(slotId: string) {
    setAssignments((prev) => ({ ...prev, [slotId]: null }));
  }

  function clearAll() {
    const next: Assignments = {};
    for (const slot of formation.slots) next[slot.slotId] = null;
    setAssignments(next);
    setError("");
  }

  function getPlayerLabel(id: number | null) {
    if (id == null) return "";
    const p = players.find((x) => x.id === id);
    if (!p) return "";
    return `#${p.number} ${p.name}`;
  }

  if (loadingPlayers) return <p>Loading formations...</p>;

  return (
    <section>
      <h2>Formations</h2>

      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <strong>Select formation:</strong>

          {(["4-4-2", "4-3-3", "4-2-3-1"] as FormationName[]).map((f) => (
            <button
              key={f}
              type="button"
              className={f === selected ? "primary" : ""}
              onClick={() => setSelected(f)}
            >
              {f}
            </button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ opacity: 0.8 }}>
              Assigned: <strong>{assignedCount}</strong> / {formation.slots.length}
            </span>
            <button type="button" onClick={clearAll}>
              Clear all
            </button>
          </div>
        </div>

        {error ? <p className="error" style={{ marginTop: 10 }}>{error}</p> : null}
      </div>

      <h3 style={{ marginTop: "1rem" }}>Pitch preview</h3>

      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <LineRow
            title="ATT"
            subtitle="Attack"
            slots={grouped.ATT}
            players={players}
            assignments={assignments}
            usedPlayerIds={usedPlayerIds}
            onAssign={assign}
            onClear={clearSlot}
            getPlayerLabel={getPlayerLabel}
          />
          <LineRow
            title="MID"
            subtitle="Midfield"
            slots={grouped.MID}
            players={players}
            assignments={assignments}
            usedPlayerIds={usedPlayerIds}
            onAssign={assign}
            onClear={clearSlot}
            getPlayerLabel={getPlayerLabel}
          />
          <LineRow
            title="DEF"
            subtitle="Defence"
            slots={grouped.DEF}
            players={players}
            assignments={assignments}
            usedPlayerIds={usedPlayerIds}
            onAssign={assign}
            onClear={clearSlot}
            getPlayerLabel={getPlayerLabel}
          />
          <LineRow
            title="GK"
            subtitle="Goalkeeper"
            slots={grouped.GK}
            players={players}
            assignments={assignments}
            usedPlayerIds={usedPlayerIds}
            onAssign={assign}
            onClear={clearSlot}
            getPlayerLabel={getPlayerLabel}
          />
        </div>

        <p style={{ marginTop: 12, opacity: 0.8 }}>
          Next: we can add an “Auto-pick best XI” button and then save this lineup to the backend.
        </p>
      </div>
    </section>
  );
}

function LineRow(props: {
  title: string;
  subtitle: string;
  slots: FormationSlot[];
  players: Player[];
  assignments: Record<string, number | null>;
  usedPlayerIds: Set<number>;
  onAssign: (slotId: string, playerId: number | null) => void;
  onClear: (slotId: string) => void;
  getPlayerLabel: (id: number | null) => string;
}) {
  const { title, subtitle, slots, players, assignments, usedPlayerIds, onAssign, onClear, getPlayerLabel } = props;

  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 2 }}>{title}</div>
      <div style={{ opacity: 0.7, marginBottom: 8 }}>{subtitle}</div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {slots.map((slot) => {
          const selectedId = assignments[slot.slotId] ?? null;

          return (
            <div
              key={slot.slotId}
              style={{
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 12,
                padding: "10px 12px",
                minWidth: 190,
              }}
              title={slot.slotId}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{slot.pos}</div>

              <select
                value={selectedId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onAssign(slot.slotId, v === "" ? null : Number(v));
                }}
                style={{ width: "100%" }}
              >
                <option value="">— Select player —</option>

                {players.map((p) => {
                  const taken = usedPlayerIds.has(p.id) && p.id !== selectedId;
                  return (
                    <option key={p.id} value={p.id} disabled={taken}>
                      #{p.number} {p.name} {taken ? "(taken)" : ""}
                    </option>
                  );
                })}
              </select>

              {selectedId != null ? (
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, opacity: 0.8 }}>{getPlayerLabel(selectedId)}</span>
                  <button type="button" onClick={() => onClear(slot.slotId)}>
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}





