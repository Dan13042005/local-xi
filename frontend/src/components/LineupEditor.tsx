import { useEffect, useMemo, useState } from "react";
import type { Player } from "../models/Players";
import type { Lineup, LineupSlot } from "../models/Lineup";
import { FORMATIONS, type FormationName, type FormationSlot } from "../models/Formation";
import { getPlayers } from "../api/playersAPI";
import { getLineupForMatch, saveLineupForMatch } from "../api/lineupsAPI";

type Props = {
  matchId: number;
  onClose: () => void;
  onSaved?: () => void;
};

function buildEmptySlots(formation: FormationName): LineupSlot[] {
  const slots: FormationSlot[] = FORMATIONS[formation].slots;
  return slots.map((s) => ({
    slotId: s.slotId,
    playerId: null,
    isCaptain: false,
    rating: null,
  }));
}

function mergeSlots(
  formation: FormationName,
  existing: LineupSlot[] | undefined
): LineupSlot[] {
  const base = buildEmptySlots(formation);
  if (!existing || existing.length === 0) return base;

  const byId = new Map(existing.map((s) => [s.slotId, s]));
  return base.map((slot) => {
    const prev = byId.get(slot.slotId);
    return prev
      ? {
          ...slot,
          playerId: prev.playerId ?? null,
          isCaptain: !!prev.isCaptain,
          rating: prev.rating ?? null,
        }
      : slot;
  });
}

export function LineupEditor({ matchId, onClose, onSaved }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [formation, setFormation] = useState<FormationName>("4-4-2");
  const [slots, setSlots] = useState<LineupSlot[]>(buildEmptySlots("4-4-2"));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // load players + existing lineup (if any)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ps, existing] = await Promise.all([
          getPlayers(),
          getLineupForMatch(matchId),
        ]);

        setPlayers([...ps].sort((a, b) => a.number - b.number));

        if (existing) {
          // existing.formation is stored as string; trust it if it matches our union
          const f = (existing.formation as FormationName) ?? "4-4-2";
          setFormation(f);
          setSlots(mergeSlots(f, existing.slots));
        } else {
          setFormation("4-4-2");
          setSlots(buildEmptySlots("4-4-2"));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lineup data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  const formationSlots = useMemo(() => FORMATIONS[formation].slots, [formation]);

  // used to prevent duplicate players in dropdowns
  const selectedPlayerIds = useMemo(() => {
    const set = new Set<number>();
    for (const s of slots) if (s.playerId != null) set.add(s.playerId);
    return set;
  }, [slots]);

  function setPlayer(slotId: string, playerId: number | null) {
    setSlots((prev) =>
      prev.map((s) => (s.slotId === slotId ? { ...s, playerId } : s))
    );
  }

  function setCaptain(slotId: string) {
    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        isCaptain: s.slotId === slotId ? !s.isCaptain : false,
      }))
    );
  }

  function changeFormation(next: FormationName) {
    setError("");
    setFormation(next);
    setSlots((prev) => mergeSlots(next, prev));
  }

  function validate(): string {
    // captain must have a player selected
    const captain = slots.find((s) => s.isCaptain);
    if (captain && captain.playerId == null) return "Captain must have a player assigned.";

    // no duplicates
    const seen = new Set<number>();
    for (const s of slots) {
      if (s.playerId == null) continue;
      if (seen.has(s.playerId)) return "A player can only be assigned once in the lineup.";
      seen.add(s.playerId);
    }

    return "";
  }

  async function handleSave() {
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const payload: Lineup = {
      matchId,
      formation,
      slots,
    };

    setSaving(true);
    try {
      await saveLineupForMatch(matchId, payload);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save lineup.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <strong>Lineup</strong>
        <p style={{ marginTop: 8 }}>Loading lineup…</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <strong>Lineup for match #{matchId}</strong>
          <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
            Assign players + captain. Ratings will come later.
          </div>
        </div>

        <button type="button" onClick={onClose} disabled={saving}>
          Close
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <strong>Formation:</strong>
        {(["4-4-2", "4-3-3", "4-2-3-1"] as FormationName[]).map((f) => (
          <button
            key={f}
            type="button"
            className={f === formation ? "primary" : ""}
            onClick={() => changeFormation(f)}
            disabled={saving}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? <p className="error" style={{ marginTop: 10 }}>{error}</p> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {formationSlots.map((slotMeta) => {
          const slot = slots.find((s) => s.slotId === slotMeta.slotId)!;

          return (
            <div
              key={slotMeta.slotId}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 140px",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {slotMeta.pos} <span style={{ opacity: 0.6, fontWeight: 400 }}>({slotMeta.slotId})</span>
              </div>

              <select
                value={slot.playerId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setPlayer(slotMeta.slotId, v === "" ? null : Number(v));
                }}
                disabled={saving}
              >
                <option value="">— Unassigned —</option>
                {players.map((p) => {
                  const takenByOtherSlot =
                    p.id !== slot.playerId && selectedPlayerIds.has(p.id);

                  return (
                    <option key={p.id} value={p.id} disabled={takenByOtherSlot}>
                      #{p.number} {p.name} ({p.positions.join(", ")})
                    </option>
                  );
                })}
              </select>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={slot.isCaptain}
                  onChange={() => setCaptain(slotMeta.slotId)}
                  disabled={saving}
                />
                Captain
              </label>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button type="button" className="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Lineup"}
        </button>
        <button type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
