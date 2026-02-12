import { useEffect, useMemo, useState } from "react";
import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { Lineup, LineupSlot } from "../models/Lineup";
import { getPlayers } from "../api/playersAPI";
import { getFormations } from "../api/formationsAPI";
import { getLineupForMatch, saveLineupForMatch } from "../api/lineupsAPI";

type Props = {
  matchId: number;
  onClose: () => void;
  onSaved?: () => void;
};

function buildEmptySlots(formation: Formation): LineupSlot[] {
  return (formation.slots ?? []).map((s) => ({
    slotId: s.slotId,          // ✅ from DB
    pos: s.position,           // label shown in UI
    playerId: null,
    isCaptain: false,
    rating: null,
  }));
}

function mergeSlots(formation: Formation, existing: LineupSlot[] | undefined): LineupSlot[] {
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
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  const [formationId, setFormationId] = useState<number | null>(null);
  const [slots, setSlots] = useState<LineupSlot[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedFormation = useMemo(
    () => formations.find((f) => f.id === formationId) ?? null,
    [formations, formationId]
  );

  // prevent duplicate players
  const selectedPlayerIds = useMemo(() => {
    const set = new Set<number>();
    for (const s of slots) if (s.playerId != null) set.add(s.playerId);
    return set;
  }, [slots]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        const [ps, fs, existing] = await Promise.all([
          getPlayers(),
          getFormations(),
          getLineupForMatch(matchId),
        ]);

        setPlayers([...ps].sort((a, b) => a.number - b.number));
        const sortedFormations = [...fs].sort((a, b) => a.name.localeCompare(b.name));
        setFormations(sortedFormations);

        // decide starting formation
        let initialFormationId: number | null =
          existing?.formationId ?? sortedFormations[0]?.id ?? null;

        setFormationId(initialFormationId);

        if (initialFormationId != null) {
          const f = sortedFormations.find((x) => x.id === initialFormationId) ?? null;
          if (f) {
            setSlots(mergeSlots(f, existing?.slots));
          } else {
            setSlots([]);
          }
        } else {
          setSlots([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lineup data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  function setPlayer(slotId: string, playerId: number | null) {
    setSlots((prev) => prev.map((s) => (s.slotId === slotId ? { ...s, playerId } : s)));
  }

  function setCaptain(slotId: string) {
    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        isCaptain: s.slotId === slotId ? !s.isCaptain : false,
      }))
    );
  }

  function changeFormation(nextId: number) {
    setError("");
    setFormationId(nextId);

    const f = formations.find((x) => x.id === nextId);
    if (!f) {
      setSlots([]);
      return;
    }
    setSlots((prev) => mergeSlots(f, prev));
  }

  function validate(): string {
    if (!selectedFormation) return "Select a formation first.";

    const captain = slots.find((s) => s.isCaptain);
    if (captain && captain.playerId == null) return "Captain must have a player assigned.";

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
    if (!selectedFormation) return;

    const payload: Lineup = {
      matchId,
      formationId: selectedFormation.id,
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
            Select a saved formation, assign players + captain.
          </div>
        </div>

        <button type="button" onClick={onClose} disabled={saving}>
          Close
        </button>
      </div>

      {error ? <p className="error" style={{ marginTop: 10 }}>{error}</p> : null}

      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ width: 280 }}>
          Formation
          <select
            value={formationId ?? ""}
            onChange={(e) => changeFormation(Number(e.target.value))}
            disabled={saving || formations.length === 0}
          >
            {formations.length === 0 ? (
              <option value="">No formations found</option>
            ) : (
              formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.shape})
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {!selectedFormation ? (
        <p style={{ marginTop: 12, opacity: 0.8 }}>
          Create a formation first in the Formations page.
        </p>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {selectedFormation.slots.map((slotMeta) => {
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
                  {slotMeta.position}{" "}
                  <span style={{ opacity: 0.6, fontWeight: 400 }}>({slotMeta.slotId})</span>
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
                    const takenByOtherSlot = p.id !== slot.playerId && selectedPlayerIds.has(p.id);
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
      )}

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button type="button" className="primary" onClick={handleSave} disabled={saving || !selectedFormation}>
          {saving ? "Saving..." : "Save Lineup"}
        </button>
        <button type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}




