import { useEffect, useMemo, useState } from "react";
import type { Formation } from "../models/Formation";
import { getFormations, updateFormation } from "../api/formationsAPI";
import { CreateFormationForm } from "../components/CreateFormationForm";

type LineKey = "ATT" | "AM" | "MID" | "DM" | "DEF" | "GK";

function guessLine(position: string): LineKey {
  const p = position.toUpperCase().trim();

  if (p === "GK") return "GK";

  if (["LB", "RB", "CB", "LCB", "RCB", "LWB", "RWB"].includes(p)) return "DEF";
  if (["CDM", "DM", "LDM", "RDM"].includes(p)) return "DM";
  if (["CAM", "AM", "LAM", "RAM", "LM", "RM"].includes(p)) return "AM";
  if (["CM", "LCM", "RCM"].includes(p)) return "MID";
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

  if (p.startsWith("L")) return "left";
  if (["LM", "LW", "LF", "LWB"].includes(p)) return "left";

  if (p.startsWith("R")) return "right";
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

  const [editingSlots, setEditingSlots] = useState(false);
  const [slotDraft, setSlotDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const role = localStorage.getItem("role");
  const isManager = role === "MANAGER";

  async function refresh() {
    setError("");
    try {
      const data = await getFormations();
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setFormations(sorted);

      const ids = new Set(sorted.map((f) => f.id));
      setSelectedId((prev) => (prev != null && ids.has(prev) ? prev : sorted[0]?.id ?? null));
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
    if (!isManager) {
      setError("You are logged in as PLAYER (read-only).");
      return;
    }
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
    if (!isManager) {
      setError("You are logged in as PLAYER (read-only).");
      return;
    }
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

      {isManager ? <CreateFormationForm onCreated={refresh} /> : null}

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
                      background: f.id === selectedId ? "rgba(34, 197, 94, 0.08)" : "transparent",
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
            <div className="card formationPreviewCard" style={{ padding: 12 }}>
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

                {isManager ? (
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
                ) : null}
              </div>

              <div className="formationLines">
                {(["ATT", "AM", "MID", "DM", "DEF", "GK"] as LineKey[]).map((line) => {
                  const lineSlots = [...grouped[line]].sort(sortByLaneThenName);

                  const left = lineSlots.filter((s) => laneForPosition(s.position) === "left");
                  const center = lineSlots.filter((s) => laneForPosition(s.position) === "center");
                  const right = lineSlots.filter((s) => laneForPosition(s.position) === "right");

                  return (
                    <div key={line} className="formationLineBlock">
                      <div className="formationLineTitle">{lineTitle(line)}</div>

                      <div className="formationLineBox">
                        {lineSlots.length === 0 ? (
                          <div className="formationEmpty">No slots</div>
                        ) : (
                          <>
                            <div className="formationLane formationLaneLeft">
                              {left.map((s) => (
                                <div
                                  key={`${line}-L-${s.idx}`}
                                  className="formationPill"
                                  title={`Slot #${s.idx + 1}`}
                                >
                                  {editingSlots && isManager ? (
                                    <input
                                      className="formationSlotInput"
                                      value={slotDraft[s.idx] ?? ""}
                                      onChange={(e) => setDraftForIndex(s.idx, e.target.value)}
                                      disabled={saving}
                                    />
                                  ) : (
                                    s.position
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="formationLane formationLaneCenter">
                              {center.map((s) => (
                                <div
                                  key={`${line}-C-${s.idx}`}
                                  className="formationPill"
                                  title={`Slot #${s.idx + 1}`}
                                >
                                  {editingSlots && isManager ? (
                                    <input
                                      className="formationSlotInput"
                                      value={slotDraft[s.idx] ?? ""}
                                      onChange={(e) => setDraftForIndex(s.idx, e.target.value)}
                                      disabled={saving}
                                    />
                                  ) : (
                                    s.position
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="formationLane formationLaneRight">
                              {right.map((s) => (
                                <div
                                  key={`${line}-R-${s.idx}`}
                                  className="formationPill"
                                  title={`Slot #${s.idx + 1}`}
                                >
                                  {editingSlots && isManager ? (
                                    <input
                                      className="formationSlotInput"
                                      value={slotDraft[s.idx] ?? ""}
                                      onChange={(e) => setDraftForIndex(s.idx, e.target.value)}
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

              {editingSlots && isManager ? (
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











