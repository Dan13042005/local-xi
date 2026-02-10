import { useEffect, useMemo, useState } from "react";
import type { Formation } from "../models/Formation";
import { getFormations } from "../api/formationsAPI";

export function FormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function refresh() {
    setError("");
    try {
      const data = await getFormations();
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setFormations(sorted);

      // keep selection valid
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
  }, []);

  const selected = useMemo(
    () => formations.find((f) => f.id === selectedId) ?? null,
    [formations, selectedId]
  );

  if (loading) return <p>Loading formations…</p>;

  return (
    <section>
      <h2>Formations</h2>

      {error ? <p className="error">{error}</p> : null}

      {formations.length === 0 ? (
        <p>No formations saved yet.</p>
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
                    onClick={() => setSelectedId(f.id)}
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
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                <div>
                  <strong>{selected.name}</strong>
                </div>
                <div style={{ opacity: 0.8 }}>({selected.shape})</div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selected.slots.map((s, idx) => (
                  <div
                    key={`${s.position}-${idx}`}
                    style={{
                      border: "1px solid rgba(0,0,0,0.15)",
                      borderRadius: 10,
                      padding: "6px 10px",
                      minWidth: 64,
                      textAlign: "center",
                    }}
                    title={s.position}
                  >
                    {s.position}
                  </div>
                ))}
              </div>

              <p style={{ marginTop: 12, opacity: 0.8 }}>
                Next: add a “Create formation” form so managers can build their own.
              </p>
            </div>
          ) : (
            <p>Select a formation to preview.</p>
          )}
        </>
      )}
    </section>
  );
}






