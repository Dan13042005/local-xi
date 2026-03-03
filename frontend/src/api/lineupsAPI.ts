import type { Lineup } from "../models/Lineup";
import { apiFetch } from "./http";

export type LineupSummary = { matchId: number; formationId: number };

export async function getLineupForMatch(matchId: number): Promise<Lineup | null> {
  // if your backend returns 404 for none, you can handle it by custom fetch
  return apiFetch<Lineup | null>(`/api/lineups/match/${matchId}`);
}

export async function saveLineupForMatch(matchId: number, lineup: Lineup): Promise<Lineup> {
  return apiFetch<Lineup>(`/api/lineups/match/${matchId}`, {
    method: "PUT",
    body: JSON.stringify(lineup),
  });
}

export async function getLineupSummaries(matchIds: number[]): Promise<LineupSummary[]> {
  return apiFetch<LineupSummary[]>("/api/lineups/summaries", {
    method: "POST",
    body: JSON.stringify({ ids: matchIds }),
  });
}
