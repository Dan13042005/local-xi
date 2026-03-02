import type { Lineup } from "../models/Lineup";
import { apiFetch } from "./http";

export type LineupSummary = {
  matchId: number;
  formationId: number;
};

export function getLineupForMatch(matchId: number): Promise<Lineup | null> {
  return apiFetch<Lineup | null>(`/api/lineups/match/${matchId}`);
}

export function saveLineupForMatch(matchId: number, lineup: Lineup): Promise<Lineup> {
  return apiFetch<Lineup>(`/api/lineups/match/${matchId}`, {
    method: "PUT",
    body: JSON.stringify(lineup),
  });
}

export function getLineupSummaries(matchIds: number[]): Promise<LineupSummary[]> {
  return apiFetch<LineupSummary[]>("/api/lineups/summaries", {
    method: "POST",
    body: JSON.stringify({ ids: matchIds }),
  });
}

