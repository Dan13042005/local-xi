import { useMemo, useState } from "react";
import type { Formation, FormationSlot } from "../models/Formation";
import { createFormation } from "../api/formationsAPI";

type Props = {
  onCreated?: () => void;
};

type Tier = "GK" | "DEF" | "DM" | "MID" | "AM" | "ATT";

// LM/RM should be in attacking midfield (AM) as you asked.
function tierForPosition(pos: string): Tier {
  const p = pos.toUpperCase().trim();

  if (p === "GK") return "GK";

  if (["LB", "RB", "CB", "LCB", "RCB", "LWB", "RWB"].includes(p)) return "DEF";

  // defensive mids
  if (["CDM", "DM", "LDM", "RDM"].includes(p)) return "DM";

  // attacking mids (include LM/RM here per your request)
  if (["CAM", "AM", "LAM", "RAM", "LM", "RM"].includes(p)) return "AM";

  // regular mids
  if (["CM", "LCM", "RCM"].includes(p)) return "MID";

  // attackers
  if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(p)) return "ATT";

  // fallback
  return "MID";
}

// Very simple “default labels” generator from shape.
// You can refine these labels later, and we ALSO let managers edit them after generation.
function buildDefaultPositionsFromShape(shape: string): string[] {
  // shape like "4-4-2" or "3-1-4-2"
  const parts = shape
    .trim()
    .split("-")
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n >= 0);

  if (parts.length < 2) {
    // fallback to classic 4-4-2
    return ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"];
  }

  // Always 1 GK
  const positions: string[] = ["GK"];

  // Common interpretation:
  // First number = defenders
  // Last number = attackers
  // Middle numbers = midfield bands from deepest to most advanced
  const defenders = parts[0];
  const attackers = parts[parts.length - 1];
  const mids = parts.slice(1, parts.length - 1);

  // DEF labels
  if (defenders === 4) positions.push("LB", "CB", "CB", "RB");
  else if (defenders === 3) positions.push("LCB", "CB", "RCB");
  else {
    for (let i = 0; i < defenders; i++) positions.push("CB");
  }

  // MID bands: we label the first mid band as DM if it looks like a DM band (often 1 or 2),
  // and the last mid band as AM if it looks advanced (often 3), otherwise CM.
  // This is just defaults — manager can edit labels.
  mids.forEach((count, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === mids.length - 1;

    const label =
      mids.length >= 2 && isFirst ? "CDM" :
      mids.length >= 2 && isLast ? "CAM" :
      "CM";

    for (let i = 0; i < count; i++) positions.push(label);
  });

  // ATT labels
  if (attackers === 3) positions.push("LW", "ST", "RW");
  else if (attackers === 2) positions.push("ST", "ST");
  else if (attackers === 1) positions.push("ST");
  else {
    for (let i = 0; i < attackers; i++) positions.push("ST");
  }

  return positions;
}

function attachStableSlotIds(positions: string[]): FormationSlot[] {
  const counters: Record<Tier, number> = {
    GK: 0,
    DEF: 0,
    DM: 0,
    MID: 0,
    AM: 0,
    ATT: 0,
  };

  return positions.map((position) => {
    const tier = tierForPosition(position);
    counters[tier] += 1;

    const slotId = `${tier}-${counters[tier]}`; // e.g. "DEF-2", "AM-1"

    return {
      position,
      slotId,
      playerId: null,
    };
  });
}

export function CreateFormationForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [shape, setShape] = useState("");
  const [slots, setSlots] = useState<FormationSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const previewPositions = useMemo(() => buildDefaultPositionsFromShape(shape), [shape]);

  function generateFromShape() {
    setError("");
    const built = attachStableSlotIds(previewPositions);
    setSlots(built);
  }

  function updateSlotLabel(index: number, next: string) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, position: next } : s))
    );
  }

  const canCreate =
    name.trim().length > 0 &&
    shape.trim().length > 0 &&
    slots.length > 0 &&
    slots.every((s) => s.slotId.trim().length > 0);

  async function handleCreate() {
    setError("");
    if (!canCreate) {
      setError("Enter name + shape, click Generate, then Create.");
      return;
    }

    const payload: Omit<Formation, "id"> = {
      name: name.trim(),
      shape: shape.trim(),
      slots: slots.map((s) => ({
        position: s.position.trim(),
        slotId: s.slotId.trim(),
        playerId: null,
      })),
    };

    setSaving(true);
    try {
      await createFormation(payload);
      setName("");
      setShape("");
      setSlots([]);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create formation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 12, marginTop: 12 }}>
      <strong>Create formation</strong>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cup shape" />
        </label>

        <label>
          Shape
          <input value={shape} onChange={(e) => setShape(e.target.value)} placeholder="e.g. 3-1-4-2" />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={generateFromShape} disabled={saving || shape.trim().length === 0}>
          Generate slots
        </button>

        <button type="button" className="primary" onClick={handleCreate} disabled={saving || !canCreate}>
          {saving ? "Creating..." : "Create"}
        </button>
      </div>

      <div style={{ marginTop: 12, opacity: 0.85 }}>
        <div style={{ fontSize: 13 }}>
          Preview positions: {previewPositions.join(", ")}
        </div>

        {slots.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Edit slot labels (slotId stays stable)</div>

            <div style={{ display: "grid", gap: 8 }}>
              {slots.map((s, idx) => (
                <div
                  key={s.slotId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: "monospace", opacity: 0.8 }}>{s.slotId}</div>
                  <input value={s.position} onChange={(e) => updateSlotLabel(idx, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="error" style={{ marginTop: 10 }}>{error}</p> : null}
    </div>
  );
}



