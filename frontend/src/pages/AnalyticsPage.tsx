import { useEffect, useMemo, useState } from "react";
import { TopPerformerLeaderboard } from "../components/TopPerformerLeaderboard";
import { SeasonSummaryCard } from "../components/SeasonSummaryCard";
import { TacticalComparison } from "../components/TacticalComparison";
import { getMatches } from "../api/matchesAPI";
import type { Match } from "../models/Match";

type Result = "W" | "D" | "L";

function isResult(m: Match) {
  return m.goalsFor != null && m.goalsAgainst != null;
}

function resultOf(m: Match): Result {
  const gf = m.goalsFor ?? 0;
  const ga = m.goalsAgainst ?? 0;
  if (gf > ga) return "W";
  if (gf === ga) return "D";
  return "L";
}

function pointsFor(m: Match): number {
  const r = resultOf(m);
  if (r === "W") return 3;
  if (r === "D") return 1;
  return 0;
}

export function AnalyticsPage() {
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

  // Only completed results, sorted oldest -> newest for time-series charts
  const results = useMemo(() => {
    return [...matches].filter(isResult).sort((a, b) => a.date.localeCompare(b.date));
  }, [matches]);

  const summary = useMemo(() => {
    let played = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let gf = 0;
    let ga = 0;
    let points = 0;

    for (const m of results) {
      played += 1;
      gf += m.goalsFor ?? 0;
      ga += m.goalsAgainst ?? 0;

      const r = resultOf(m);
      if (r === "W") wins += 1;
      else if (r === "D") draws += 1;
      else losses += 1;

      points += pointsFor(m);
    }

    return { played, wins, draws, losses, gf, ga, gd: gf - ga, points };
  }, [results]);

  // Points accumulation series
  const pointsSeries = useMemo(() => {
    let running = 0;
    return results.map((m) => {
      running += pointsFor(m);
      return {
        id: m.id,
        date: m.date,
        opponent: m.opponent,
        venue: m.home ? "H" : "A",
        gf: m.goalsFor ?? 0,
        ga: m.goalsAgainst ?? 0,
        result: resultOf(m),
        pointsAfter: running,
      };
    });
  }, [results]);

  // For simple bar scaling (GF/GA)
  const maxGoalsInMatch = useMemo(() => {
    let max = 1;
    for (const m of results) {
      max = Math.max(max, m.goalsFor ?? 0, m.goalsAgainst ?? 0);
    }
    return max;
  }, [results]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Season Analytics</h1>

      {loading ? <div style={{ marginTop: 12 }}>Loading analytics…</div> : null}
      {error ? <div style={{ marginTop: 12, color: "crimson", fontWeight: 700 }}>{error}</div> : null}

      {/* Summary card (moved off MatchesPage) */}
      <div style={{ marginTop: 12 }}>
        <SeasonSummaryCard />
      </div>

      {/* Tactical Comparison */}
      <div style={{ marginTop: 20 }}>
        <TacticalComparison />
      </div>

      {/* Charts */}
      <div style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 10 }}>Charts</h2>

        {results.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No results yet — add scores in Matches to generate charts.</div>
        ) : (
          <>
            {/* Summary strip */}
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div>
                <strong>Played:</strong> {summary.played}
              </div>
              <div>
                <strong>W:</strong> {summary.wins}
              </div>
              <div>
                <strong>D:</strong> {summary.draws}
              </div>
              <div>
                <strong>L:</strong> {summary.losses}
              </div>
              <div>
                <strong>GF:</strong> {summary.gf}
              </div>
              <div>
                <strong>GA:</strong> {summary.ga}
              </div>
              <div>
                <strong>GD:</strong> {summary.gd}
              </div>
              <div>
                <strong>Points:</strong> {summary.points}
              </div>
            </div>

            {/* Points over time */}
            <div
              style={{
                marginTop: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Points over time</div>

              {(() => {
                const maxPts = Math.max(1, pointsSeries[pointsSeries.length - 1]?.pointsAfter ?? 1);

                return (
                  <div style={{ display: "grid", gap: 8 }}>
                    {pointsSeries.map((p) => {
                      const widthPct = (p.pointsAfter / maxPts) * 100;

                      return (
                        <div
                          key={p.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "110px 1fr 60px",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontFamily: "monospace", fontSize: 13 }}>{p.date}</div>

                          <div
                            style={{
                              height: 10,
                              borderRadius: 999,
                              background: "rgba(0,0,0,0.08)",
                              overflow: "hidden",
                            }}
                            title={`${p.date} vs ${p.opponent} (${p.venue}) ${p.gf}-${p.ga} (${p.result}) → ${p.pointsAfter} pts`}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${widthPct}%`,
                                background: "rgba(79,70,229,0.65)",
                              }}
                            />
                          </div>

                          <div style={{ textAlign: "right", fontWeight: 800 }}>{p.pointsAfter}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* GF/GA per match bars */}
            <div
              style={{
                marginTop: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 10 }}>GF/GA per match</div>

              <div style={{ display: "grid", gap: 10 }}>
                {results.map((m) => {
                  const gf = m.goalsFor ?? 0;
                  const ga = m.goalsAgainst ?? 0;

                  const gfW = (gf / maxGoalsInMatch) * 100;
                  const gaW = (ga / maxGoalsInMatch) * 100;

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "110px 1fr 1fr 70px",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontFamily: "monospace", fontSize: 13 }}>{m.date}</div>

                      {/* GF bar */}
                      <div
                        style={{
                          height: 12,
                          borderRadius: 999,
                          background: "rgba(0,0,0,0.08)",
                          overflow: "hidden",
                        }}
                        title={`GF: ${gf}`}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${gfW}%`,
                            background: "rgba(34,197,94,0.65)",
                          }}
                        />
                      </div>

                      {/* GA bar */}
                      <div
                        style={{
                          height: 12,
                          borderRadius: 999,
                          background: "rgba(0,0,0,0.08)",
                          overflow: "hidden",
                        }}
                        title={`GA: ${ga}`}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${gaW}%`,
                            background: "rgba(239,68,68,0.65)",
                          }}
                        />
                      </div>

                      <div style={{ textAlign: "right", fontWeight: 800 }}>
                        {gf}–{ga}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
                Left bar = GF (green), right bar = GA (red).
              </div>
            </div>
          </>
        )}
      </div>

      {/* Leaderboard */}
      <div style={{ marginTop: 20 }}>
        <TopPerformerLeaderboard />
      </div>
    </div>
  );
}