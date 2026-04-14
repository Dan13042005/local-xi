import { useEffect, useMemo, useRef, useState } from "react";
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
  rating: number | null;
};

type ParsedNumber = {
  value: number | null;
  valid: boolean;
};

function parseOptionalNonNegativeInt(raw: string): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, valid: true };

  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return { value: null, valid: false };

  return { value: n, valid: true };
}

function emptyPlayerStats(): PlayerStats {
  return { goals: null, assists: null, yellowCards: null, redCards: null, rating: null };
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

function parseRating(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;

  const normalized = t.replace(",", ".");
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;

  const clamped = Math.min(10, Math.max(0, n));
  return Math.round(clamped * 10) / 10;
}

function fromPlayerStatsArray(arr: PlayerMatchStat[] | undefined): Record<number, PlayerStats> {
  const out: Record<number, PlayerStats> = {};
  for (const s of arr ?? []) {
    out[s.playerId] = {
      goals: s.goals ?? null,
      assists: s.assists ?? null,
      yellowCards: s.yellowCards ?? null,
      redCards: s.redCards ?? null,
      rating: s.rating ?? null,
    };
  }
  return out;
}

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
      rating: s.rating ?? null,
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
    rating: st.rating ?? null,
  }));
}

export function LineupEditor({ matchId, onClose, onSaved }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  const [formationId, setFormationId] = useState<number | null>(null);
  const [slots, setSlots] = useState<LineupSlot[]>([]);

  const [playerStatsById, setPlayerStatsById] = useState<Record<number, PlayerStats>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<number | null>(null);

  const pitchRef = useRef<HTMLDivElement | null>(null);

  const selectedFormation = useMemo(
    () => formations.find((f) => f.id === formationId) ?? null,
    [formations, formationId]
  );

  const selectedPlayerIds = useMemo(() => {
    const set = new Set<number>();
    for (const s of slots) if (s.playerId != null) set.add(s.playerId);
    return set;
  }, [slots]);

  const benchPlayers = useMemo(() => {
    return players.filter((p) => !selectedPlayerIds.has(p.id));
  }, [players, selectedPlayerIds]);

  const slotsForDisplay = useMemo(() => {
    return slots.map((s) => {
      if (s.playerId == null) {
        return {
          ...s,
          goals: null,
          assists: null,
          yellowCards: null,
          redCards: null,
        };
      }

      const st = playerStatsById[s.playerId] ?? emptyPlayerStats();

      return {
        ...s,
        goals: st.goals,
        assists: st.assists,
        yellowCards: st.yellowCards,
        redCards: st.redCards,
      };
    });
  }, [slots, playerStatsById]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      setSelectedSlotId(null);
      setSelectedBenchPlayerId(null);

      try {
        const [psRes, fsRes, existingRes] = await Promise.allSettled([
          getPlayers(),
          getFormations(),
          getLineupForMatch(matchId),
        ]);

        const ps = psRes.status === "fulfilled" ? psRes.value : [];
        if (!cancelled) setPlayers([...ps].sort((a, b) => a.number - b.number));

        const fs = fsRes.status === "fulfilled" ? fsRes.value : [];
        const sortedFormations = [...fs].sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setFormations(sortedFormations);

        let existing: any = null;
        if (existingRes.status === "fulfilled") {
          existing = existingRes.value;
        } else {
          const msg =
            existingRes.reason instanceof Error ? existingRes.reason.message : String(existingRes.reason);

          const looksLike404 = msg.includes("404") || msg.toLowerCase().includes("not found");
          if (!looksLike404) {
            if (!cancelled) setError(msg || "Failed to load existing lineup.");
          }
        }

        const initialFormationId = existing?.formationId ?? sortedFormations[0]?.id ?? null;
        if (!cancelled) setFormationId(initialFormationId);

        if (initialFormationId != null) {
          const f = sortedFormations.find((x) => x.id === initialFormationId) ?? null;
          if (!cancelled) setSlots(f ? mergeSlots(f, existing?.slots) : []);
        } else {
          if (!cancelled) setSlots([]);
        }

        const loadedStats =
          existing?.playerStats && existing.playerStats.length > 0
            ? fromPlayerStatsArray(existing.playerStats)
            : fromSlotsLegacy(existing?.slots as any);

        if (!cancelled) setPlayerStatsById(loadedStats);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load lineup data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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

  function setStatForPlayer(
    playerId: number | null,
    field: "goals" | "assists" | "yellowCards" | "redCards",
    raw: string
  ) {
    if (playerId == null) return;

    const parsed = parseOptionalNonNegativeInt(raw);
    if (!parsed.valid) return;

    setPlayerStatsById((prev) => {
      const curr = prev[playerId] ?? emptyPlayerStats();
      return { ...prev, [playerId]: { ...curr, [field]: parsed.value } };
    });
  }

  function setBenchPlayerRating(playerId: number, raw: string) {
    const rating = parseRating(raw);

    setPlayerStatsById((prev) => {
      const curr = prev[playerId] ?? emptyPlayerStats();
      return { ...prev, [playerId]: { ...curr, rating } };
    });
  }

  function swapSlots(fromSlotId: string, toSlotId: string) {
    setSlots((prev) => {
      const a = prev.find((x) => x.slotId === fromSlotId);
      const b = prev.find((x) => x.slotId === toSlotId);
      if (!a || !b) return prev;

      return prev.map((s) => {
        if (s.slotId === a.slotId) {
          return { ...s, playerId: b.playerId ?? null, rating: b.rating ?? null, isCaptain: !!b.isCaptain };
        }
        if (s.slotId === b.slotId) {
          return { ...s, playerId: a.playerId ?? null, rating: a.rating ?? null, isCaptain: !!a.isCaptain };
        }
        return s;
      });
    });

    setSelectedSlotId(null);
    setSelectedBenchPlayerId(null);
  }

  function handlePitchSlotClick(clickedSlotId: string) {
    setError("");

    if (selectedBenchPlayerId != null) {
      setSlots((prev) =>
        prev.map((s) => (s.slotId === clickedSlotId ? { ...s, playerId: selectedBenchPlayerId } : s))
      );
      setSelectedBenchPlayerId(null);
      setSelectedSlotId(null);
      return;
    }

    if (selectedSlotId == null) {
      setSelectedSlotId(clickedSlotId);
      return;
    }

    if (selectedSlotId === clickedSlotId) {
      setSelectedSlotId(null);
      return;
    }

    swapSlots(selectedSlotId, clickedSlotId);
  }

  function handleBenchClick(playerId: number) {
    setError("");
    setSelectedSlotId(null);
    setSelectedBenchPlayerId((prev) => (prev === playerId ? null : playerId));
  }

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

    for (const [pidStr, st] of Object.entries(playerStatsById)) {
      const pid = Number(pidStr);
      if (!Number.isFinite(pid)) return "Invalid player stats detected.";

      const vals = [st.goals, st.assists, st.yellowCards, st.redCards];
      if (vals.some((v) => v != null && v < 0)) return "Stats must be 0 or higher.";

      if (st.rating != null && (st.rating < 0 || st.rating > 10)) {
        return "Bench player ratings must be between 0 and 10.";
      }
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
      playerStats: toPlayerStatsArray(playerStatsById).filter(
        (s) =>
          (s.goals ?? 0) > 0 ||
          (s.assists ?? 0) > 0 ||
          (s.yellowCards ?? 0) > 0 ||
          (s.redCards ?? 0) > 0 ||
          s.rating != null
      ),
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

  async function handleExportPng() {
    const el = pitchRef.current;
    if (!el) return;

    const html2canvas = (await import("html2canvas")).default;

    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `lineup-match-${matchId}.png`;
    a.click();
  }

  async function handleExportPdf() {
    const el = pitchRef.current;
    if (!el) return;

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = canvas.width;
    const imgH = canvas.height;
    const scale = Math.min(pageW / imgW, pageH / imgH);

    const renderW = imgW * scale;
    const renderH = imgH * scale;

    const x = (pageW - renderW) / 2;
    const y = (pageH - renderH) / 2;

    pdf.addImage(imgData, "PNG", x, y, renderW, renderH);
    pdf.save(`lineup-match-${matchId}.pdf`);
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
    <div className="card" style={{ padding: "clamp(10px, 2vw, 16px)", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <strong>Lineup for match #{matchId}</strong>
          <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
            Bench click → pitch click assigns. Pitch click → pitch click swaps. Drag bench player onto a pitch pill to
            assign. Drag pitch pill onto another to swap.
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
        <label style={{ width: "min(100%, 320px)" }}>
          Formation
          <select
            value={formationId ?? ""}
            onChange={(e) => changeFormation(Number(e.target.value))}
            disabled={saving || formations.length === 0}
            style={{ width: "100%" }}
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
              slots={slotsForDisplay}
              players={players}
              onSlotClick={handlePitchSlotClick}
              selectedSlotId={selectedSlotId}
              onSwapSlots={swapSlots}
              onDropPlayerToSlot={handleDropPlayerToSlot}
              exportRef={pitchRef}
            />

            <LineupStatsDashboard
              formation={selectedFormation}
              slots={slotsForDisplay}
              players={players}
              playerStats={toPlayerStatsArray(playerStatsById)}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Bench</div>

            {benchPlayers.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>No bench players (everyone is on the pitch).</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
                {benchPlayers.map((p) => {
                  const active = selectedBenchPlayerId === p.id;
                  const benchStats = playerStatsById[p.id] ?? emptyPlayerStats();

                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 110,
                        flex: "0 1 auto",
                      }}
                    >
                      <button
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
                          border: active
                            ? "2px solid rgba(34, 197, 94, 0.65)"
                            : "1px solid rgba(255, 255, 255, 0.14)",
                          background: active
                            ? "rgba(34, 197, 94, 0.12)"
                            : "rgba(15, 22, 33, 0.6)",
                          color: "var(--text)",
                          boxShadow: active
                            ? "0 0 0 4px var(--accent-glow), 0 10px 22px rgba(0, 0, 0, 0.35)"
                            : "0 10px 22px rgba(0, 0, 0, 0.35)",
                          cursor: "grab",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          minWidth: 110,
                          maxWidth: "100%",
                          textAlign: "center",
                        }}
                        title={`${p.name} (${p.positions.join(", ")})`}
                      >
                        #{p.number} {p.name}
                      </button>

                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="Rating"
                        value={benchStats.rating ?? ""}
                        onChange={(e) => setBenchPlayerRating(p.id, e.target.value)}
                        disabled={saving}
                        style={{
                          width: 80,
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--text)",
                          padding: "6px 8px",
                          textAlign: "center",
                        }}
                        title="Bench player match rating"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <div style={{ display: "grid", gap: 10, minWidth: 760 }}>
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
                      gridTemplateColumns: "150px minmax(180px, 1fr) 90px 120px 70px 70px 80px 80px",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {slotMeta.position} <span style={{ opacity: 0.6, fontWeight: 400 }}>({slotMeta.slotId})</span>
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
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
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
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="primary" onClick={handleSave} disabled={saving || !selectedFormation}>
          {saving ? "Saving..." : "Save Lineup"}
        </button>

        <button type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>

        <button type="button" onClick={handleExportPng} disabled={!selectedFormation || saving}>
          Export PNG
        </button>

        <button type="button" onClick={handleExportPdf} disabled={!selectedFormation || saving}>
          Export PDF
        </button>
      </div>
    </div>
  );
}