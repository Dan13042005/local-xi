import { useMemo, useState } from "react";
import type { Formation, FormationSlot } from "../models/Formation";
import { createFormation } from "../api/formationsAPI";

type Props = {
  onCreated?: () => void;
};

type ParsedShape =
  | { ok: true; parts: number[] } // e.g. [4,2,3,1]
  | { ok: false; message: string };

function parseShape(raw: string): ParsedShape {
  const s = raw.trim();
  if (!s) return { ok: false, message: "Shape is required (e.g. 4-4-2)." };

  // allow "4-4-2" and "4 4 2" (we'll normalize spaces to -)
  const normalized = s.replace(/\s+/g, "-");
  const tokens = normalized.split("-").filter(Boolean);

  if (tokens.length < 2) {
    return { ok: false, message: "Shape must have at least 2 lines (e.g. 4-4-2)." };
  }

  const parts: number[] = [];
  for (const t of tokens) {
    const n = Number(t);
    if (!Number.isInteger(n) || n <= 0) {
      return { ok: false, message: "Shape must be numbers like 4-4-2 (positive integers only)." };
    }
    parts.push(n);
  }

  const sum = parts.reduce((a, b) => a + b, 0);
  // We assume outfield players = 10 (GK is separate)
  if (sum !== 10) {
    return { ok: false, message: `Shape must add up to 10 outfield players. Yours adds to ${sum}.` };
  }

  return { ok: true, parts };
}

function buildSlotsFromShape(parts: number[]): FormationSlot[] {
  // parts: [DEF, MID, ATT] or [DEF, MID1, MID2, ATT] etc
  // We interpret:
  // - first number = DEF count
  // - last number = ATT count
  // - everything in between = MID count (combined)
  const defCount = parts[0];
  const attCount = parts[parts.length - 1];
  const midCount = parts.slice(1, -1).reduce((a, b) => a + b, 0);

  const slots: FormationSlot[] = [];

  // GK
  slots.push({ position: "GK", playerId: null });

  // DEF labels (simple, sensible defaults)
  // 3 => LCB/CB/RCB, 4 => LB/LCB/RCB/RB, 5 => LWB/LCB/CB/RCB/RWB etc.
  const defLabels =
    defCount === 3
      ? ["LCB", "CB", "RCB"]
      : defCount === 4
      ? ["LB", "LCB", "RCB", "RB"]
      : defCount === 5
      ? ["LWB", "LCB", "CB", "RCB", "RWB"]
      : Array.from({ length: defCount }, (_, i) => `DEF${i + 1}`);

  defLabels.forEach((p) => slots.push({ position: p, playerId: null }));

  // MID labels
  // 2 => CM/CM, 3 => CM/CM/CM, 4 => LM/CM/CM/RM, 5 => LM/CM/CM/CM/RM
  const midLabels =
    midCount === 2
      ? ["CM", "CM"]
      : midCount === 3
      ? ["CM", "CM", "CM"]
      : midCount === 4
      ? ["LM", "CM", "CM", "RM"]
      : midCount === 5
      ? ["LM", "CM", "CM", "CM", "RM"]
      : Array.from({ length: midCount }, (_, i) => `MID${i + 1}`);

  midLabels.forEach((p) => slots.push({ position: p, playerId: null }));

  // ATT labels
  // 1 => ST, 2 => ST/ST, 3 => LW/ST/RW
  const attLabels =
    attCount === 1
      ? ["ST"]
      : attCount === 2
      ? ["ST", "ST"]
      : attCount === 3
      ? ["LW", "ST", "RW"]
      : Array.from({ length: attCount }, (_, i) => `ATT${i + 1}`);

  attLabels.forEach((p) => slots.push({ position: p, playerId: null }));

  return slots;
}

export function CreateFormationForm({ onCreated }: Props) {
  const [name, setName] = useState<string>("");
  const [shape, setShape] = useState<string>("4-4-2");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const parsed = useMemo(() => parseShape(shape), [shape]);

  const previewSlots = useMemo(() => {
    if (!parsed.ok) return [];
    return buildSlotsFromShape(parsed.parts);
  }, [parsed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Formation name is required.");
      return;
    }

    const p = parseShape(shape);
    if (!p.ok) {
      setError(p.message);
      return;
    }

    const slots = buildSlotsFromShape(p.parts);

    setSaving(true);
    try {
      const payload: Omit<Formation, "id"> = {
        name: trimmedName,
        shape: shape.trim().replace(/\s+/g, "-"),
        slots,
      };

      await createFormation(payload);

      setName("");
      setShape("4-4-2");
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create formation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" style={{ padding: 12, marginTop: 12 }} onSubmit={handleSubmit}>
      <strong>Create formation</strong>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
        <label style={{ flex: "1 1 260px" }}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cup Final XI"
            disabled={saving}
          />
        </label>

        <label style={{ width: 180 }}>
          Shape
          <input
            value={shape}
            onChange={(e) => setShape(e.target.value)}
            placeholder="e.g. 4-4-2"
            disabled={saving}
          />
        </label>

        <button type="submit" className="primary" disabled={saving || !parsed.ok}>
          {saving ? "Saving..." : "Create"}
        </button>
      </div>

      {!parsed.ok ? (
        <p className="error" style={{ marginTop: 10 }}>
          {parsed.message}
        </p>
      ) : (
        <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
          Preview slots: {previewSlots.map((s) => s.position).join(", ")}
        </div>
      )}

      {error ? (
        <p className="error" style={{ marginTop: 10 }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}


