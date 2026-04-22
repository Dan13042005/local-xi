// src/api/lineupsAPI.ts
import type { Lineup } from "../models/Lineup";
import { apiFetch } from "./http";

export type LineupSummary = {
  matchId: number;
  formationId: number;
};

function isNotFoundError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  // matches your apiFetch error style: "Request failed (404)" or backend text containing 404
  return msg.includes("404") || msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no lineup");
}

// Get lineup for one match
export async function getLineupForMatch(matchId: number): Promise<Lineup | null> {
  try {
    // suppressAuthRedirect so we don't auto-kick on non-auth errors
    return await apiFetch<Lineup>(`/api/lineups/match/${matchId}`, {
      suppressAuthRedirect: true,
    });
  } catch (e) {
    if (isNotFoundError(e)) return null; // ✅ key fix
    throw e;
  }
}

// Save lineup for match
export async function saveLineupForMatch(matchId: number, lineup: Lineup): Promise<Lineup> {
  return apiFetch<Lineup>(`/api/lineups/match/${matchId}`, {
    method: "PUT",
    body: JSON.stringify(lineup),
  });
}

// Lineup summaries used in MatchesPage (Backend expects: { ids: [...] })
export async function getLineupSummaries(matchIds: number[]): Promise<LineupSummary[]> {
  return apiFetch<LineupSummary[]>(`/api/lineups/summaries`, {
    method: "POST",
    body: JSON.stringify({ ids: matchIds }),
  });
}
