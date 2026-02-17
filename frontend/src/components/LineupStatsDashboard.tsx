import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { LineupSlot } from "../models/Lineup";

type Props = {
  formation: Formation;
  slots: LineupSlot[];
  players: Player[];
};

export function LineupStatsDashboard({ formation, slots, players }: Props) {
  const playerById = new Map(players.map((p) => [p.id, p]));

  const rows = (formation.slots ?? [])
    .map((meta) => {
      const s = slots.find((x) => x.slotId === meta.slotId);
      if (!s) return null;

      const p = s.playerId != null ? playerById.get(s.playerId) ?? null : null;

      return {
        slotId: s.slotId,
        pos: (s.pos ?? meta.position ?? "").trim(),
        playerId: s.playerId,
        captain: !!s.isCaptain,
        rating: s.rating,
        playerName: p ? `#${p.number} ${p.name}` : "—",
      };
    })
    .filter(Boolean) as {
    slotId: string;
    pos: string;
    playerId: number | null;
    captain: boolean;
    rating: number | null;
    playerName: string;
  }[];

  const assigned = rows.filter((r) => r.playerId != null);

  const avgRating = (() => {
    const rated = assigned.filter((r) => r.rating != null);
    if (rated.length === 0) return null;
    const sum = rated.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  })();

  const potm = (() => {
    const rated = assigned
      .filter((r) => r.rating != null)
      .slice()
      .sort((a, b) => {
        const diff = (b.rating ?? -999) - (a.rating ?? -999);
        if (diff !== 0) return diff;
        if (a.captain !== b.captain) return a.captain ? 1 : -1;
        return a.slotId.localeCompare(b.slotId);
      });
    return rated[0] ?? null;
  })();

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Player stats</div>

      <div
        className="card"
        style={{
          padding: 12,
          border: "1px solid rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <div>
            <strong>Assigned:</strong> {assigned.length}/{rows.length}
          </div>
          <div>
            <strong>Avg rating:</strong> {avgRating != null ? `⭐ ${avgRating}` : "—"}
          </div>
          <div>
            <strong>POTM:</strong>{" "}
            {potm ? (
              <>
                🔥 {potm.playerName} {potm.rating != null ? `(⭐ ${potm.rating})` : ""}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Pos</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Player</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Captain</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isPotm = potm?.slotId === r.slotId;
                return (
                  <tr
                    key={r.slotId}
                    style={{
                      background: isPotm ? "rgba(255,165,0,0.12)" : "transparent",
                      borderTop: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <td style={{ padding: "8px 6px", fontWeight: 700 }}>{r.pos || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{r.playerName}</td>
                    <td style={{ padding: "8px 6px" }}>{r.captain ? "✅" : "—"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {r.rating != null ? `⭐ ${r.rating}` : "—"}
                      {isPotm ? " 🔥" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
          Ratings + POTM appear once you start saving ratings on lineup slots.
        </div>
      </div>
    </div>
  );
}
