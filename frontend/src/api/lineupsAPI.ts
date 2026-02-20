import type { Lineup } from "../models/Lineup";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080") as string;

async function asTextOrJsonError(res: Response): Promise<string> {
  const text = await res.text();
  return text || `Request failed (${res.status})`;
}

/* =========================
   Get lineup for one match
   ========================= */

export async function getLineupForMatch(matchId: number): Promise<Lineup | null> {
  const res = await fetch(`${BASE_URL}/api/lineups/match/${matchId}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await asTextOrJsonError(res));

  return (await res.json()) as Lineup;
}

/* =========================
   Save lineup for match
   ========================= */

export async function saveLineupForMatch(
  matchId: number,
  lineup: Lineup
): Promise<Lineup> {
  const res = await fetch(`${BASE_URL}/api/lineups/match/${matchId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lineup),
  });

  if (!res.ok) throw new Error(await asTextOrJsonError(res));
  return (await res.json()) as Lineup;
}

/* =========================
   Lineup summaries (NEW)
   Used in MatchesPage
   ========================= */

export type LineupSummary = {
  matchId: number;
  formationId: number;
};

export async function getLineupSummaries(
  matchIds: number[]
): Promise<LineupSummary[]> {
  const res = await fetch(`${BASE_URL}/api/lineups/summaries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: matchIds }), // ✅ must match backend
  });

  if (!res.ok) throw new Error(await asTextOrJsonError(res));
  return (await res.json()) as LineupSummary[];
}

