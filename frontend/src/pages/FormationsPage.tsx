import { useEffect, useMemo, useState } from "react";
import type { Formation } from "../models/Formation";
import { getFormations, updateFormation } from "../api/formationsAPI";
import { CreateFormationForm } from "../components/CreateFormationForm";

type LineKey = "ATT" | "AM" | "MID" | "DM" | "DEF" | "GK";

function guessLine(position: string): LineKey {
  const p = position.toUpperCase().trim();

  if (p === "GK") return "GK";

  // Defence
  if (["LB", "RB", "CB", "LCB", "RCB", "LWB", "RWB"].includes(p)) return "DEF";

  // Defensive midfield
  if (["CDM", "DM", "LDM", "RDM"].includes(p)) return "DM";

  // Attacking midfield (includes wide mids)
  if (["CAM", "AM", "LAM", "RAM", "LM", "RM"].includes(p)) return "AM";

  // Central midfield
  if (["CM", "LCM", "RCM"].includes(p)) return "MID";

  // Attack
  if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(p)) return "ATT";

  return "MID";
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

type Lane = "left" | "center" | "right";

function laneForPosition(position: string): Lane {
  const p = position.toUpperCase().trim();

  // Left side
  if (p.startsWith("L")) return "left"; // LB, LCB, LCM, LW, LM, etc
  if (["LM", "LW", "LF", "LWB"].includes(p)) return "left";

  // Right side
  if (p.startsWith("R")) return "right"; // RB, RCB, RCM, RW, RM, etc
  if (["RM", "RW", "RF", "RWB"].includes(p)) return "right";

  return "center";
}

function sortByLaneThenName(a: { position: string }, b: { position: string }) {
  const order: Record<Lane, number> = { left: 0, center: 1, right: 2 };
  const la = laneForPosition(a.position);
  const lb = laneForPosition(b.position);

  if (order[la] !== order[lb]) return order[la] - order[lb];
  return a.position.localeCompare(b.position);
}

export function FormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Slot edit state
  const [editingSlots, setEditingSlots] = useState(false);
  const [slotDraft, setSlotDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setError("");
    try {
      const data = await getFormations();
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setFormations(sorted);

      const ids = new Set(sorted.map((f) => f.id));
      setSelectedId((prev) =>
        prev != null && ids.has(prev) ? prev : sorted[0]?.id ?? null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load formations.");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => formations.find((f) => f.id === selectedId) ?? null,
    [formations, selectedId]
  );

  // group slots into pitch lines, but keep original slot index (important for editing)
  const grouped = useMemo(() => {
    const lines: Record<LineKey, { position: string; idx: number }[]> = {
      ATT: [],
      AM: [],
      MID: [],
      DM: [],
      DEF: [],
      GK: [],
    };

    if (!selected) return lines;

    const slots = selected.slots ?? [];
    for (let i = 0; i < slots.length; i++) {
      const pos = slots[i].position;
      const line = guessLine(pos);
      lines[line].push({ position: pos, idx: i });
    }

    return lines;
  }, [selected]);

  function startEditSlots() {
    if (!selected) return;

    const draft: Record<number, string> = {};
    (selected.slots ?? []).forEach((s, idx) => {
      draft[idx] = s.position;
    });

    setSlotDraft(draft);
    setEditingSlots(true);
    setError("");
  }

  function cancelEditSlots() {
    setEditingSlots(false);
    setSlotDraft({});
    setError("");
  }

  function setDraftForIndex(idx: number, value: string) {
    setSlotDraft((prev) => ({ ...prev, [idx]: value }));
  }

  function validateSlotDraft(): string {
    if (!selected) return "No formation selected.";

    const slots = selected.slots ?? [];
    if (slots.length === 0) return "This formation has no slots.";

    for (let i = 0; i < slots.length; i++) {
      const v = (slotDraft[i] ?? "").trim();
      if (v.length === 0) return "Slot labels cannot be blank.";
    }

    return "";
  }

  async function saveSlots() {
    if (!selected) return;

    setError("");
    const msg = validateSlotDraft();
    if (msg) {
      setError(msg);
      return;
    }

    const updatedSlots = (selected.slots ?? []).map((s, idx) => ({
      ...s,
      position: (slotDraft[idx] ?? s.position).trim(),
    }));

    setSaving(true);
    try {
      await updateFormation(selected.id, { slots: updatedSlots });

      setEditingSlots(false);
      setSlotDraft({});
      await refresh();
      setSelectedId(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update formation slots.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading formations…</p>;

  return (
    <section>
      <h2>Formations</h2>

      {error ? <p className="error">{error}</p> : null}

      <CreateFormationForm onCreated={refresh} />

      {formations.length === 0 ? (
        <p style={{ marginTop: 12 }}>No formations saved yet.</p>
      ) : (
        <>
          <div className="card" style={{ padding: 12, marginTop: 12 }}>
            <strong>Saved formations</strong>

            <table style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Shape</th>
                  <th>Slots</th>
                </tr>
              </thead>
              <tbody>
                {formations.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => {
                      setSelectedId(f.id);
                      setEditingSlots(false);
                      setSlotDraft({});
                    }}
                    style={{
                      cursor: "pointer",
                      background: f.id === selectedId ? "rgba(0,0,0,0.04)" : "transparent",
                    }}
                  >
                    <td>{f.name}</td>
                    <td>{f.shape}</td>
                    <td>{f.slots?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: "1rem" }}>Preview</h3>

          {selected ? (
            <div className="card" style={{ padding: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div>
                    <strong>{selected.name}</strong>
                  </div>
                  <div style={{ opacity: 0.8 }}>({selected.shape})</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {!editingSlots ? (
                    <button type="button" onClick={startEditSlots} disabled={saving}>
                      Edit slot labels
                    </button>
                  ) : (
                    <>
                      <button type="button" className="primary" onClick={saveSlots} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEditSlots} disabled={saving}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Pitch-style layout */}
              <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                {(["ATT", "AM", "MID", "DM", "DEF", "GK"] as LineKey[]).map((line) => {
                  const lineSlots = [...grouped[line]].sort(sortByLaneThenName);

                  const left = lineSlots.filter((s) => laneForPosition(s.position) === "left");
                  const center = lineSlots.filter((s) => laneForPosition(s.position) === "center");
                  const right = lineSlots.filter((s) => laneForPosition(s.position) === "right");

                  return (
                    <div key={line}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{lineTitle(line)}</div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 10,
                          padding: "10px 8px",
                          border: "1px dashed rgba(0,0,0,0.15)",
                          borderRadius: 12,
                          alignItems: "center",
                        }}
                      >
                        {lineSlots.length === 0 ? (
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              textAlign: "center",
                              opacity: 0.6,
                              fontSize: 13,
                            }}
                          >
                            No slots
                          </div>
                        ) : (
                          <>
                            {/* LEFT */}
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                justifyContent: "flex-start",
                              }}
                            >
                              {left.map((s) => (
                                <div
                                  key={`${line}-L-${s.idx}`}
                                  style={{
                                    border: "1px solid rgba(0,0,0,0.2)",
                                    borderRadius: 999,
                                    padding: "6px 14px",
                                    minWidth: 56,
                                    textAlign: "center",
                                    background: "#fff",
                                  }}
                                  title={`Slot #${s.idx + 1}`}
                                >
                                  {editingSlots ? (
                                    <input
                                      value={slotDraft[s.idx] ?? ""}
                                      onChange={(e) => setDraftForIndex(s.idx, e.target.value)}
                                      style={{
                                        width: 70,
                                        border: "1px solid rgba(0,0,0,0.2)",
                                        borderRadius: 8,
                                        padding: "4px 8px",
                                        textAlign: "center",
                                      }}
                                      disabled={saving}
                                    />
                                  ) : (
                                    s.position
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* CENTER */}
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                justifyContent: "center",
                              }}
                            >
                              {center.map((s) => (
                                <div
                                  key={`${line}-C-${s.idx}`}
                                  style={{
                                    border: "1px solid rgba(0,0,0,0.2)",
                                    borderRadius: 999,
                                    padding: "6px 14px",
                                    minWidth: 56,
                                    textAlign: "center",
                                    background: "#fff",
                                  }}
                                  title={`Slot #${s.idx + 1}`}
                                >
                                  {editingSlots ? (
                                    <input
                                      value={slotDraft[s.idx] ?? ""}
                                      onChange={(e) => setDraftForIndex(s.idx, e.target.value)}
                                      style={{
                                        width: 70,
                                        border: "1px solid rgba(0,0,0,0.2)",
                                        borderRadius: 8,
                                        padding: "4px 8px",
                                        textAlign: "center",
                                      }}
                                      disabled={saving}
                                    />
                                  ) : (
                                    s.position
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* RIGHT */}
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                justifyContent: "flex-end",
                              }}
                            >
                              {right.map((s) => (
                                <div
                                  key={`${line}-R-${s.idx}`}
                                  style={{
                                    border: "1px solid rgba(0,0,0,0.2)",
                                    borderRadius: 999,
                                    padding: "6px 14px",
                                    minWidth: 56,
                                    textAlign: "center",
                                    background: "#fff",
                                  }}
                                  title={`Slot #${s.idx + 1}`}
                                >
                                  {editingSlots ? (
                                    <input
                                      value={slotDraft[s.idx] ?? ""}
                                      onChange={(e) => setDraftForIndex(s.idx, e.target.value)}
                                      style={{
                                        width: 70,
                                        border: "1px solid rgba(0,0,0,0.2)",
                                        borderRadius: 8,
                                        padding: "4px 8px",
                                        textAlign: "center",
                                      }}
                                      disabled={saving}
                                    />
                                  ) : (
                                    s.position
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {editingSlots ? (
                <p style={{ marginTop: 12, opacity: 0.8, fontSize: 13 }}>
                  Tip: Use standard labels like GK/LB/CB/RB, CDM/CM/CAM, LW/ST/RW.
                </p>
              ) : null}
            </div>
          ) : (
            <p>Select a formation to preview.</p>
          )}
        </>
      )}
    </section>
  );
}











