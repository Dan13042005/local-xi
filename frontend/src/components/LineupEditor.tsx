import { useEffect, useMemo, useState } from "react";
import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { Lineup, LineupSlot, PlayerMatchStat } from "../models/Lineup";
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

type PlayerStats = {
  goals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
};

type ParsedNumber = {
  value: number | null; // null means blank
  valid: boolean; // false means invalid input
};

function parseOptionalNonNegativeInt(raw: string): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, valid: true };

  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return { value: null, valid: false };

  return { value: n, valid: true };
}

function emptyPlayerStats(): PlayerStats {
  return { goals: null, assists: null, yellowCards: null, redCards: null };
}

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

// ✅ Allows decimals; clamps to 0.0–10.0; keeps 1dp
function parseRating(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;

  const normalized = t.replace(",", ".");
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;

  const clamped = Math.min(10, Math.max(0, n));
  return Math.round(clamped * 10) / 10; // 1dp
}

function fromPlayerStatsArray(arr: PlayerMatchStat[] | undefined): Record<number, PlayerStats> {
  const out: Record<number, PlayerStats> = {};
  for (const s of arr ?? []) {
    out[s.playerId] = {
      goals: s.goals ?? null,
      assists: s.assists ?? null,
      yellowCards: s.yellowCards ?? null,
      redCards: s.redCards ?? null,
    };
  }
  return out;
}

// Backward compat: if stats were previously stored on slots, extract them by playerId
function fromSlotsLegacy(slots: Array<any> | undefined): Record<number, PlayerStats> {
  const out: Record<number, PlayerStats> = {};
  for (const s of slots ?? []) {
    if (s?.playerId == null) continue;
    const pid = Number(s.playerId);
    out[pid] = {
      goals: s.goals ?? null,
      assists: s.assists ?? null,
      yellowCards: s.yellowCards ?? null,
      redCards: s.redCards ?? null,
    };
  }
  return out;
}

function toPlayerStatsArray(map: Record<number, PlayerStats>): PlayerMatchStat[] {
  return Object.entries(map).map(([playerId, st]) => ({
    playerId: Number(playerId),
    goals: st.goals ?? null,
    assists: st.assists ?? null,
    yellowCards: st.yellowCards ?? null,
    redCards: st.redCards ?? null,
  }));
}

export function LineupEditor({ matchId, onClose, onSaved }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  const [formationId, setFormationId] = useState<number | null>(null);
  const [slots, setSlots] = useState<LineupSlot[]>([]);

  // ✅ Option 1: stats keyed by playerId
  const [playerStatsById, setPlayerStatsById] = useState<Record<number, PlayerStats>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ✅ selection state for click swap / bench assignment
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<number | null>(null);

  const selectedFormation = useMemo(
    () => formations.find((f) => f.id === formationId) ?? null,
    [formations, formationId]
  );

  // prevent duplicate players (on pitch)
  const selectedPlayerIds = useMemo(() => {
    const set = new Set<number>();
    for (const s of slots) if (s.playerId != null) set.add(s.playerId);
    return set;
  }, [slots]);

  // bench = players not currently selected on pitch
  const benchPlayers = useMemo(() => {
    return players.filter((p) => !selectedPlayerIds.has(p.id));
  }, [players, selectedPlayerIds]);

  /**
   * ✅ FRONTEND FIX:
   * Provide slot.goals/assists/yellowCards/redCards for PitchPreview + StatsDashboard
   * by merging stats from playerStatsById into each slot (display-only).
   */
  const slotsForDisplay = useMemo(() => {
    return slots.map((s) => {
      if (s.playerId == null) {
        return { ...s, goals: null, assists: null, yellowCards: null, redCards: null };
      }
      const st = playerStatsById[s.playerId] ?? emptyPlayerStats();
      return { ...s, ...st };
    });
  }, [slots, playerStatsById]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      setSelectedSlotId(null);
      setSelectedBenchPlayerId(null);

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

        // ✅ Load stats:
        // Prefer Option-1 payload field existing.playerStats, otherwise fall back to legacy slot stats
        const loadedStats =
          existing?.playerStats && existing.playerStats.length > 0
            ? fromPlayerStatsArray(existing.playerStats)
            : fromSlotsLegacy(existing?.slots as any);

        setPlayerStatsById(loadedStats);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lineup data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  function changeFormation(nextId: number) {
    setError("");
    setFormationId(nextId);
    setSelectedSlotId(null);
    setSelectedBenchPlayerId(null);

    const f = formations.find((x) => x.id === nextId);
    if (!f) {
      setSlots([]);
      return;
    }
    setSlots((prev) => mergeSlots(f, prev));
  }

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

  // ✅ Option 1: stats setter (by playerId)
  function setStatForPlayer(playerId: number | null, field: keyof PlayerStats, raw: string) {
    if (playerId == null) return;

    const parsed = parseOptionalNonNegativeInt(raw);
    if (!parsed.valid) return;

    setPlayerStatsById((prev) => {
      const curr = prev[playerId] ?? emptyPlayerStats();
      return { ...prev, [playerId]: { ...curr, [field]: parsed.value } };
    });
  }

  // ✅ swap helper (used by click-swap AND pitch drag swap)
  // NOTE: stats follow playerId automatically (stored separately), so swap only moves players/ratings/captain
  function swapSlots(fromSlotId: string, toSlotId: string) {
    setSlots((prev) => {
      const a = prev.find((x) => x.slotId === fromSlotId);
      const b = prev.find((x) => x.slotId === toSlotId);
      if (!a || !b) return prev;

      return prev.map((s) => {
        if (s.slotId === a.slotId) {
          return {
            ...s,
            playerId: b.playerId ?? null,
            rating: b.rating ?? null,
            isCaptain: !!b.isCaptain,
          };
        }
        if (s.slotId === b.slotId) {
          return {
            ...s,
            playerId: a.playerId ?? null,
            rating: a.rating ?? null,
            isCaptain: !!a.isCaptain,
          };
        }
        return s;
      });
    });

    setSelectedSlotId(null);
    setSelectedBenchPlayerId(null);
  }

  // ✅ click a pitch pill (bench assign OR click-swap)
  function handlePitchSlotClick(clickedSlotId: string) {
    setError("");

    // bench player armed => assign them to this slot
    if (selectedBenchPlayerId != null) {
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === clickedSlotId
            ? {
                ...s,
                playerId: selectedBenchPlayerId,
              }
            : s
        )
      );
      setSelectedBenchPlayerId(null);
      setSelectedSlotId(null);
      return;
    }

    // first click selects slot
    if (selectedSlotId == null) {
      setSelectedSlotId(clickedSlotId);
      return;
    }

    // clicking same slot toggles off
    if (selectedSlotId === clickedSlotId) {
      setSelectedSlotId(null);
      return;
    }

    // otherwise swap slot-to-slot
    swapSlots(selectedSlotId, clickedSlotId);
  }

  // ✅ click bench player to arm/unarm
  function handleBenchClick(playerId: number) {
    setError("");
    setSelectedSlotId(null);
    setSelectedBenchPlayerId((prev) => (prev === playerId ? null : playerId));
  }

  // ✅ drag bench player onto pitch slot
  function handleDropPlayerToSlot(slotId: string, playerId: number) {
    setError("");
    setSlots((prev) => prev.map((s) => (s.slotId === slotId ? { ...s, playerId } : s)));
    setSelectedBenchPlayerId(null);
    setSelectedSlotId(null);
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

    // Defensive check for stats map
    for (const [pidStr, st] of Object.entries(playerStatsById)) {
      const pid = Number(pidStr);
      if (!Number.isFinite(pid)) return "Invalid player stats detected.";
      const vals = [st.goals, st.assists, st.yellowCards, st.redCards];
      if (vals.some((v) => v != null && v < 0)) return "Stats must be 0 or higher.";
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
      slots, // ✅ base slots
      playerStats: toPlayerStatsArray(playerStatsById).filter((s) =>
        (s.goals ?? 0) > 0 ||
        (s.assists ?? 0) > 0 ||
        (s.yellowCards ?? 0) > 0 ||
        (s.redCards ?? 0) > 0
      ), // ✅ Option 1 saved separately
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

  const smallNumStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.2)",
    padding: "6px 8px",
  };

  return (
    <div className="card" style={{ padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <strong>Lineup for match #{matchId}</strong>
          <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
            Bench click → pitch click assigns. Pitch click → pitch click swaps.
            Drag bench player onto a pitch pill to assign. Drag pitch pill onto another to swap.
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
            <LineupPitchPreview
              formation={selectedFormation}
              slots={slotsForDisplay} // ✅ FIX: provide goals/assists/cards on slots
              players={players}
              onSlotClick={handlePitchSlotClick}
              selectedSlotId={selectedSlotId}
              onSwapSlots={swapSlots}
              onDropPlayerToSlot={handleDropPlayerToSlot}
            />

            <LineupStatsDashboard formation={selectedFormation} slots={slotsForDisplay} players={players} />
          </div>

          {/* ✅ Bench (click + drag) */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Bench</div>

            {benchPlayers.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>No bench players (everyone is on the pitch).</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {benchPlayers.map((p) => {
                  const active = selectedBenchPlayerId === p.id;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", `player:${p.id}`);
                        e.dataTransfer.effectAllowed = "copy";
                        setSelectedBenchPlayerId(p.id);
                        setSelectedSlotId(null);
                      }}
                      onClick={() => handleBenchClick(p.id)}
                      style={{
                        borderRadius: 999,
                        padding: "8px 12px",
                        border: active ? "2px solid #4f46e5" : "1px solid rgba(0,0,0,0.22)",
                        background: active ? "rgba(79,70,229,0.08)" : "#fff",
                        boxShadow: active
                          ? "0 8px 18px rgba(79,70,229,0.18)"
                          : "0 6px 14px rgba(0,0,0,0.08)",
                        cursor: "grab",
                        fontWeight: 800,
                      }}
                      title={`${p.name} (${p.positions.join(", ")})`}
                    >
                      #{p.number} {p.name}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedBenchPlayerId != null ? (
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                Bench player selected — click (or drop onto) a pitch slot to assign.
              </div>
            ) : selectedSlotId != null ? (
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                Pitch slot selected — click another pitch slot to swap.
              </div>
            ) : null}
          </div>

          {/* ✅ Editor rows + stats that stick to player */}
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {selectedFormation.slots.map((slotMeta) => {
              const slot = slots.find((s) => s.slotId === slotMeta.slotId);
              if (!slot) return null;

              const stats =
                slot.playerId != null ? playerStatsById[slot.playerId] ?? emptyPlayerStats() : emptyPlayerStats();

              return (
                <div
                  key={slotMeta.slotId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "150px 1fr 90px 120px 70px 70px 80px 80px",
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
                    style={smallNumStyle}
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

                  {/* Stats inputs (disabled until a player is assigned) */}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="G"
                    value={stats.goals ?? ""}
                    onChange={(e) => setStatForPlayer(slot.playerId ?? null, "goals", e.target.value)}
                    disabled={saving || slot.playerId == null}
                    style={smallNumStyle}
                    title="Goals"
                    aria-label={`${slotMeta.position} goals`}
                  />

                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="A"
                    value={stats.assists ?? ""}
                    onChange={(e) => setStatForPlayer(slot.playerId ?? null, "assists", e.target.value)}
                    disabled={saving || slot.playerId == null}
                    style={smallNumStyle}
                    title="Assists"
                    aria-label={`${slotMeta.position} assists`}
                  />

                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="YC"
                    value={stats.yellowCards ?? ""}
                    onChange={(e) => setStatForPlayer(slot.playerId ?? null, "yellowCards", e.target.value)}
                    disabled={saving || slot.playerId == null}
                    style={smallNumStyle}
                    title="Yellow cards"
                    aria-label={`${slotMeta.position} yellow cards`}
                  />

                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="RC"
                    value={stats.redCards ?? ""}
                    onChange={(e) => setStatForPlayer(slot.playerId ?? null, "redCards", e.target.value)}
                    disabled={saving || slot.playerId == null}
                    style={smallNumStyle}
                    title="Red cards"
                    aria-label={`${slotMeta.position} red cards`}
                  />
                </div>
              );
            })}
          </div>
        </>
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