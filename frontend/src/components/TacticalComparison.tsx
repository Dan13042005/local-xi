import { useEffect, useMemo, useState } from "react";
import { getMatches } from "../api/matchesAPI";
import { getFormations } from "../api/formationsAPI";
import { getLineupForMatch, getLineupSummaries } from "../api/lineupsAPI";
import type { Match } from "../models/Match";
import type { Formation } from "../models/Formation";

type Row = {
  formationId: number;
  formationLabel: string;

  matches: number;
  wins: number;
  draws: number;
  losses: number;

  points: number;
  ppg: number;

  gf: number;
  ga: number;
  gd: number;

  avgGF: number;
  avgGA: number;
  avgGD: number;

  avgTeamRating: number | null;
};

function isResult(m: Match) {
  return m.goalsFor != null && m.goalsAgainst != null;
}

function resultOf(m: Match): "W" | "D" | "L" {
  const gf = m.goalsFor ?? 0;
  const ga = m.goalsAgainst ?? 0;
  if (gf > ga) return "W";
  if (gf === ga) return "D";
  return "L";
}

function pointsFor(m: Match) {
  const r = resultOf(m);
  if (r === "W") return 3;
  if (r === "D") return 1;
  return 0;
}

function safeDiv(n: number, d: number) {
  return d === 0 ? 0 : n / d;
}

export function TacticalComparison() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rows, setRows] = useState<Row[]>([]);
  const [sortKey, setSortKey] = useState<
    "ppg" | "matches" | "avgTeamRating" | "avgGF" | "avgGA" | "avgGD"
  >("ppg");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        const [matches, formations] = await Promise.all([getMatches(), getFormations()]);

        const results = matches.filter(isResult);
        const matchIdToMatch = new Map(results.map((m) => [m.id, m]));
        const matchIds = results.map((m) => m.id);

        if (matchIds.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        // Summaries tell us which matches have a saved lineup + formationId
        const summaries = await getLineupSummaries(matchIds);
        if (summaries.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        const formationMap = new Map<number, Formation>(formations.map((f) => [f.id, f]));

        // Group matchIds by formationId (only for matches that have a lineup summary)
        const byFormation = new Map<number, number[]>();
        for (const s of summaries) {
          const m = matchIdToMatch.get(s.matchId);
          if (!m) continue; // only results
          const arr = byFormation.get(s.formationId) ?? [];
          arr.push(s.matchId);
          byFormation.set(s.formationId, arr);
        }

        // For avgTeamRating we need lineup details (slot ratings)
        // We'll fetch lineups for all summary matchIds (only once)
        const uniqueMatchIds = Array.from(new Set(summaries.map((s) => s.matchId)));
        const lineupPairs = await Promise.all(
          uniqueMatchIds.map(async (id) => {
            const lineup = await getLineupForMatch(id);
            return [id, lineup] as const;
          })
        );
        const lineupByMatchId = new Map(lineupPairs);

        const computed: Row[] = [];

        for (const [formationId, ids] of byFormation.entries()) {
          let wins = 0;
          let draws = 0;
          let losses = 0;
          let points = 0;

          let gf = 0;
          let ga = 0;

          // Team rating aggregation
          let totalTeamRating = 0;
          let teamRatingCount = 0;

          for (const matchId of ids) {
            const m = matchIdToMatch.get(matchId);
            if (!m) continue;

            const r = resultOf(m);
            if (r === "W") wins++;
            else if (r === "D") draws++;
            else losses++;

            points += pointsFor(m);
            gf += m.goalsFor ?? 0;
            ga += m.goalsAgainst ?? 0;

            const lineup = lineupByMatchId.get(matchId) ?? null;
            if (lineup?.slots?.length) {
              const ratings = lineup.slots
                .map((s: any) => (typeof s.rating === "number" ? s.rating : null))
                .filter((x: number | null) => x != null) as number[];

              if (ratings.length > 0) {
                const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                totalTeamRating += avg;
                teamRatingCount += 1;
              }
            }
          }

          const matchesUsed = ids.length;
          const gd = gf - ga;

          const label = (() => {
            const f = formationMap.get(formationId);
            return f ? `${f.name} (${f.shape})` : `Formation #${formationId}`;
          })();

          computed.push({
            formationId,
            formationLabel: label,
            matches: matchesUsed,
            wins,
            draws,
            losses,
            points,
            ppg: safeDiv(points, matchesUsed),
            gf,
            ga,
            gd,
            avgGF: safeDiv(gf, matchesUsed),
            avgGA: safeDiv(ga, matchesUsed),
            avgGD: safeDiv(gd, matchesUsed),
            avgTeamRating: teamRatingCount > 0 ? safeDiv(totalTeamRating, teamRatingCount) : null,
          });
        }

        setRows(computed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tactical comparison.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      if (sortKey === "avgTeamRating") {
        const av = a.avgTeamRating ?? -1;
        const bv = b.avgTeamRating ?? -1;
        return bv - av;
      }
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
    return list;
  }, [rows, sortKey]);

  if (loading) return <div style={{ marginTop: 12 }}>Loading tactical comparison…</div>;
  if (error) return <div style={{ marginTop: 12, color: "crimson", fontWeight: 700 }}>{error}</div>;

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Tactical Comparison</h2>

      {rows.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.8 }}>
          No tactical data yet — add match results and save lineups for those matches.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>Sort by:</div>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
              <option value="ppg">PPG</option>
              <option value="matches">Matches</option>
              <option value="avgTeamRating">Avg Team Rating</option>
              <option value="avgGF">Avg GF</option>
              <option value="avgGA">Avg GA</option>
              <option value="avgGD">Avg GD</option>
            </select>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>
                  Formation
                </th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>M</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>W</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>D</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>L</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>Pts</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>PPG</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>Avg GF</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>Avg GA</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>Avg GD</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>Avg Rating</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((r) => (
                <tr key={r.formationId}>
                  <td style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <strong>{r.formationLabel}</strong>
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.matches}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.wins}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.draws}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.losses}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.points}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.ppg.toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.avgGF.toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.avgGA.toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.avgGD.toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {r.avgTeamRating != null ? r.avgTeamRating.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
            Notes: “Avg Rating” is the average of pitch slot ratings per match, then averaged across matches for that formation.
          </div>
        </>
      )}
    </div>
  );
}