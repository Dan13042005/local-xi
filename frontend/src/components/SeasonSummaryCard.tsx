import { useEffect, useMemo, useState } from "react";
import { getMatches } from "../api/matchesAPI";
import type { Match } from "../models/Match";

type SeasonStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

function computeStats(list: Match[]): SeasonStats {
  const played = list.length;

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let gf = 0;
  let ga = 0;

  for (const m of list) {
    const gFor = m.goalsFor ?? 0;
    const gAgainst = m.goalsAgainst ?? 0;

    gf += gFor;
    ga += gAgainst;

    if (gFor > gAgainst) wins++;
    else if (gFor === gAgainst) draws++;
    else losses++;
  }

  const gd = gf - ga;
  const points = wins * 3 + draws;

  return { played, wins, draws, losses, gf, ga, gd, points };
}

function resultLabel(m: Match): "W" | "D" | "L" | "—" {
  if (m.goalsFor == null || m.goalsAgainst == null) return "—";
  if (m.goalsFor > m.goalsAgainst) return "W";
  if (m.goalsFor === m.goalsAgainst) return "D";
  return "L";
}

function venueLabel(m: Match) {
  return m.home ? "H" : "A";
}

function formatResult(m: Match) {
  if (m.goalsFor == null || m.goalsAgainst == null) return "—";
  return `${m.goalsFor}–${m.goalsAgainst}`;
}

export function SeasonSummaryCard() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getMatches();
        setMatches(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load matches.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const results = useMemo(() => {
    return [...matches]
      .filter((m) => m.goalsFor != null && m.goalsAgainst != null)
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }, [matches]);

  const seasonStats = useMemo(() => computeStats(results), [results]);
  const recentForm = useMemo(() => results.slice(0, 5), [results]);

  if (loading) return <div style={{ padding: 12 }}>Loading season summary…</div>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div style={{ marginTop: 16 }}>
      <h2>Season Summary</h2>

      {results.length === 0 ? (
        <p>No results yet — add scores to fixtures to generate stats.</p>
      ) : (
        <div className="card" style={{ padding: "12px 14px", marginTop: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <div>
              <strong>Played:</strong> {seasonStats.played}
            </div>
            <div>
              <strong>W:</strong> {seasonStats.wins}
            </div>
            <div>
              <strong>D:</strong> {seasonStats.draws}
            </div>
            <div>
              <strong>L:</strong> {seasonStats.losses}
            </div>
            <div>
              <strong>GF:</strong> {seasonStats.gf}
            </div>
            <div>
              <strong>GA:</strong> {seasonStats.ga}
            </div>
            <div>
              <strong>GD:</strong> {seasonStats.gd}
            </div>
            <div>
              <strong>Points:</strong> {seasonStats.points}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <strong>Recent form (last {recentForm.length}):</strong>{" "}
            {recentForm.map((m) => (
              <span
                key={m.id}
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.15)",
                  marginLeft: 6,
                  fontSize: 13,
                }}
                title={`${m.date} vs ${m.opponent} (${venueLabel(m)}) ${formatResult(m)}`}
              >
                {resultLabel(m)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}