import { useEffect, useMemo, useState } from "react";
import { getMatches } from "../api/matchesAPI";
import { getLineupForMatch } from "../api/lineupsAPI";
import { getPlayers } from "../api/playersAPI";


type Aggregated = {
  playerId: number;
  name: string;
  number: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  totalRating: number;
  ratingCount: number;
  potm: number;
};

export function TopPerformerLeaderboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Aggregated[]>([]);
  const [sortKey, setSortKey] = useState<keyof Aggregated>("goals");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [matches, players] = await Promise.all([
        getMatches(),
        getPlayers(),
      ]);

      const playerMap = new Map(players.map(p => [p.id, p]));

      const agg = new Map<number, Aggregated>();

      for (const match of matches) {
        const lineup = await getLineupForMatch(match.id);
        if (!lineup) continue;

        // Player stats
        for (const stat of lineup.playerStats ?? []) {
          const p = playerMap.get(stat.playerId);
          if (!p) continue;

          if (!agg.has(p.id)) {
            agg.set(p.id, {
              playerId: p.id,
              name: p.name,
              number: p.number,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              totalRating: 0,
              ratingCount: 0,
              potm: 0,
            });
          }

          const row = agg.get(p.id)!;
          row.goals += stat.goals ?? 0;
          row.assists += stat.assists ?? 0;
          row.yellowCards += stat.yellowCards ?? 0;
          row.redCards += stat.redCards ?? 0;
        }

        // Ratings + POTM from slots
        const bestSlot = lineup.slots?.reduce((best, s) => {
          if (s.rating == null) return best;
          if (!best || s.rating > best.rating!) return s;
          return best;
        }, null as any);

        for (const slot of lineup.slots ?? []) {
          if (!slot.playerId) continue;
          const row = agg.get(slot.playerId);
          if (!row) continue;

          if (slot.rating != null) {
            row.totalRating += slot.rating;
            row.ratingCount += 1;
          }

          if (bestSlot && slot.slotId === bestSlot.slotId) {
            row.potm += 1;
          }
        }
      }

      setRows(Array.from(agg.values()));
      setLoading(false);
    }

    load();
  }, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
  }, [rows, sortKey]);

  if (loading) return <div style={{ padding: 20 }}>Loading leaderboard…</div>;

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Top Performer Leaderboard</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th onClick={() => setSortKey("goals")}>Goals</th>
            <th onClick={() => setSortKey("assists")}>Assists</th>
            <th onClick={() => setSortKey("potm")}>POTM</th>
            <th onClick={() => setSortKey("yellowCards")}>YC</th>
            <th onClick={() => setSortKey("redCards")}>RC</th>
            <th>Avg Rating</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.playerId}>
              <td>#{r.number} {r.name}</td>
              <td>{r.goals}</td>
              <td>{r.assists}</td>
              <td>{r.potm}</td>
              <td>{r.yellowCards}</td>
              <td>{r.redCards}</td>
              <td>
                {r.ratingCount > 0
                  ? (r.totalRating / r.ratingCount).toFixed(2)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}