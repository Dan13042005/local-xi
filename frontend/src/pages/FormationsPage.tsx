import { useMemo, useState } from "react";
import {
  FORMATIONS,
  type Formation,
  type FormationLine,
  type FormationName,
  type FormationSlot,
} from "../models/Formation";

const ORDER: FormationLine[] = ["ATT", "MID", "DEF", "GK"];

const LINE_LABELS: Record<FormationLine, string> = {
  ATT: "Attack",
  MID: "Midfield",
  DEF: "Defence",
  GK: "Goalkeeper",
};

export function FormationsPage() {
  const [selected, setSelected] = useState<FormationName>("4-4-2");

  const formation: Formation = FORMATIONS[selected];

  const grouped = useMemo(() => {
    const lines: Record<FormationLine, FormationSlot[]> = {
      GK: [],
      DEF: [],
      MID: [],
      ATT: [],
    };

    for (const slot of formation.slots) lines[slot.line].push(slot);

    // stable order within a line (DEF-1, DEF-2...)
    for (const line of Object.keys(lines) as FormationLine[]) {
      lines[line].sort((a, b) => a.slotId.localeCompare(b.slotId));
    }

    return lines;
  }, [formation]);

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
        </div>
      </div>

      <h3 style={{ marginTop: "1rem" }}>Pitch preview</h3>

      <div className="card" style={{ padding: 14, marginTop: 8 }}>
        {/* Pitch container */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.12)",
            padding: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle pitch markings (no custom colors) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.12,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px) 0 0 / 100% 25%",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 1,
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.20)",
              pointerEvents: "none",
              opacity: 0.18,
            }}
          />

          {/* Rows */}
          <div style={{ display: "grid", gap: 16, position: "relative" }}>
            {ORDER.map((line) => (
              <PitchRow
                key={line}
                title={LINE_LABELS[line]}
                shortTitle={line}
                slots={grouped[line]}
              />
            ))}
          </div>
        </div>

        <p style={{ marginTop: 12, opacity: 0.8 }}>
          Step 1.5 complete: pitch-style preview with centred lines. Next: assign players to slots.
        </p>
      </div>
    </section>
  );
}

function PitchRow(props: {
  title: string;
  shortTitle: string;
  slots: FormationSlot[];
}) {
  const { title, shortTitle, slots } = props;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr",
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* Line label */}
      <div style={{ opacity: 0.85 }}>
        <div style={{ fontWeight: 700 }}>{shortTitle}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      </div>

      {/* Slots on that line */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          flexWrap: "wrap",
          padding: "10px 8px",
          borderRadius: 14,
          border: "1px dashed rgba(0,0,0,0.18)",
        }}
      >
        {slots.map((slot) => (
          <SlotChip key={slot.slotId} slot={slot} />
        ))}
      </div>
    </div>
  );
}

function SlotChip({ slot }: { slot: FormationSlot }) {
  return (
    <div
      title={slot.slotId}
      style={{
        width: 66,
        height: 44,
        display: "grid",
        placeItems: "center",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.18)",
        fontWeight: 700,
        userSelect: "none",
      }}
    >
      {slot.pos}
    </div>
  );
}




