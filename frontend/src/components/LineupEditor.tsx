import { useEffect, useMemo, useState } from "react";
import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { Lineup, LineupSlot } from "../models/Lineup";
import { getPlayers } from "../api/playersAPI";
import { getFormations } from "../api/formationsAPI";
import { getLineupForMatch, saveLineupForMatch } from "../api/lineupsAPI";
import { LineupPitchPreview } from "./LineupPitchPreview";
import { LineupStatsDashboard } from "./LineupStatsDashboard";

type Props = {
  matchId: number;
  onClose: () => void;
  onSaved?: () => void;
};

function buildEmptySlots(formation: Formation): LineupSlot[] {
  return (formation.slots ?? []).map((s) => ({
    slotId: s.slotId,
    pos: s.position,
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

// ✅ Allows decimals; clamps to 0.0–10.0; preserves up to 1 dp (change if you want)
function parseRating(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;

  // accept comma decimal too (e.g. "7,5")
  const normalized = t.replace(",", ".");
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;

  const clamped = Math.min(10, Math.max(0, n));
  // keep 1 decimal place (remove rounding if you want full precision)
  return Math.round(clamped * 10) / 10;
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

        const initialFormationId = existing?.formationId ?? sortedFormations[0]?.id ?? null;
        setFormationId(initialFormationId);

        if (initialFormationId != null) {
          const f = sortedFormations.find((x) => x.id === initialFormationId) ?? null;
          setSlots(f ? mergeSlots(f, existing?.slots) : []);
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

  function setRating(slotId: string, raw: string) {
    const rating = parseRating(raw);
    setSlots((prev) => prev.map((s) => (s.slotId === slotId ? { ...s, rating } : s)));
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

    for (const s of slots) {
      if (s.rating == null) continue;
      if (s.rating < 0 || s.rating > 10) return "Ratings must be between 0 and 10.";
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
            Select a saved formation, assign players + captain + ratings.
          </div>
        </div>

        <button type="button" onClick={onClose} disabled={saving}>
          Close
        </button>
      </div>

      {error ? (
        <p className="error" style={{ marginTop: 10 }}>
          {error}
        </p>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ width: 320 }}>
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
        <p style={{ marginTop: 12, opacity: 0.8 }}>Create a formation first in the Formations page.</p>
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <LineupPitchPreview formation={selectedFormation} slots={slots} players={players} />
            <LineupStatsDashboard formation={selectedFormation} slots={slots} players={players} />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {selectedFormation.slots.map((slotMeta) => {
              const slot = slots.find((s) => s.slotId === slotMeta.slotId);
              if (!slot) return null;

              return (
                <div
                  key={slotMeta.slotId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "150px 1fr 90px 120px",
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
                          #{p.number} {p.name}
                        </option>
                      );
                    })}
                  </select>

                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0–10"
                    value={slot.rating ?? ""}
                    onChange={(e) => setRating(slotMeta.slotId, e.target.value)}
                    disabled={saving}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.2)",
                      padding: "6px 8px",
                    }}
                  />

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
        </>
      )}

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button
          type="button"
          className="primary"
          onClick={handleSave}
          disabled={saving || !selectedFormation}
        >
          {saving ? "Saving..." : "Save Lineup"}
        </button>
        <button type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}











