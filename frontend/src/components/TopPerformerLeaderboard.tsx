import { useEffect, useMemo, useState } from "react";
import { getMatches } from "../api/matchesAPI";
import { getLineupForMatch } from "../api/lineupsAPI";
import { getPlayers } from "../api/playersAPI";
import "../styles/tables.css";

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

type SortOption =
  | "goals"
  | "assists"
  | "potm"
  | "yellowCards"
  | "redCards"
  | "avgRating"
  | "ratingCount";

export function TopPerformerLeaderboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Aggregated[]>([]);
  const [sortKey, setSortKey] = useState<SortOption>("goals");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [matches, players] = await Promise.all([getMatches(), getPlayers()]);

        const playerMap = new Map(players.map((p) => [p.id, p]));
        const agg = new Map<number, Aggregated>();

        function ensureRow(playerId: number): Aggregated | null {
          const p = playerMap.get(playerId);
          if (!p) return null;

          if (!agg.has(playerId)) {
            agg.set(playerId, {
              playerId,
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

          return agg.get(playerId)!;
        }

        for (const match of matches) {
          const lineup = await getLineupForMatch(match.id);
          if (!lineup) continue;

          const matchRatings = new Map<number, number>();

          for (const slot of lineup.slots ?? []) {
            if (slot.playerId == null) continue;

            ensureRow(slot.playerId);

            if (typeof slot.rating === "number") {
              matchRatings.set(slot.playerId, slot.rating);
            }
          }

          for (const stat of lineup.playerStats ?? []) {
            const row = ensureRow(stat.playerId);
            if (!row) continue;

            row.goals += stat.goals ?? 0;
            row.assists += stat.assists ?? 0;
            row.yellowCards += stat.yellowCards ?? 0;
            row.redCards += stat.redCards ?? 0;

            if (typeof stat.rating === "number") {
              matchRatings.set(stat.playerId, stat.rating);
            }
          }

          for (const [playerId, rating] of matchRatings.entries()) {
            const row = ensureRow(playerId);
            if (!row) continue;

            row.totalRating += rating;
            row.ratingCount += 1;
          }

          let bestPlayerId: number | null = null;
          let bestRating: number | null = null;

          for (const [playerId, rating] of matchRatings.entries()) {
            if (bestRating == null || rating > bestRating) {
              bestRating = rating;
              bestPlayerId = playerId;
            }
          }

          if (bestPlayerId != null) {
            const row = ensureRow(bestPlayerId);
            if (row) row.potm += 1;
          }
        }

        setRows(Array.from(agg.values()));
      } catch (e) {
        console.error("Leaderboard failed to load:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === "avgRating") {
        const aAvg = a.ratingCount > 0 ? a.totalRating / a.ratingCount : -1;
        const bAvg = b.ratingCount > 0 ? b.totalRating / b.ratingCount : -1;
        return bAvg - aAvg;
      }

      return (b[sortKey] as number) - (a[sortKey] as number);
    });
  }, [rows, sortKey]);

  if (loading) return <div className="leaderboard-loading">Loading leaderboard…</div>;

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>Top Performer Leaderboard</h2>

        <div className="leaderboard-sort">
          <label>Sort by</label>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortOption)}
          >
            <option value="goals">Goals</option>
            <option value="assists">Assists</option>
            <option value="potm">POTM</option>
            <option value="yellowCards">Yellow Cards</option>
            <option value="redCards">Red Cards</option>
            <option value="avgRating">Average Rating</option>
            <option value="ratingCount">Appearances</option>
          </select>
        </div>
      </div>

      <div className="leaderboard-card">
        <table className="leaderboard">
          <colgroup>
            <col style={{ width: "40%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>

          <thead>
            <tr>
              <th className="th-left">Player</th>
              <th>Apps</th>
              <th>Goals</th>
              <th>Assists</th>
              <th>POTM</th>
              <th>YC</th>
              <th>RC</th>
              <th>Avg</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((r) => {
              const avgRating =
                r.ratingCount > 0 ? r.totalRating / r.ratingCount : null;

              return (
                <tr key={r.playerId}>
                  <td className="leaderboard-player">
                    <div className="leaderboard-number">#{r.number}</div>
                    <span title={r.name}>{r.name}</span>
                  </td>

                  <td>{r.ratingCount}</td>
                  <td>{r.goals}</td>
                  <td>{r.assists}</td>
                  <td>{r.potm}</td>
                  <td>{r.yellowCards}</td>
                  <td>{r.redCards}</td>

                  <td>
                    {avgRating == null ? (
                      "—"
                    ) : (
                      <span
                        className={`rating rating-${
                          avgRating < 5
                            ? "bad"
                            : avgRating < 7
                            ? "mid"
                            : avgRating < 8
                            ? "good"
                            : "elite"
                        }`}
                      >
                        {avgRating.toFixed(1)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="leaderboard-empty">
                  No player stats available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

