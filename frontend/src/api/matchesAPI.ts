import type { Match } from "../models/Match";
import { apiFetch } from "./http";

export function getMatches(): Promise<Match[]> {
  return apiFetch<Match[]>("/api/matches");
}

export function createMatch(match: Omit<Match, "id">): Promise<Match> {
  return apiFetch<Match>("/api/matches", {
    method: "POST",
    body: JSON.stringify(match),
  });
}

export function updateMatch(id: number, patch: Partial<Match>): Promise<Match> {
  return apiFetch<Match>(`/api/matches/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteMatches(ids: number[]): Promise<void> {
  return apiFetch<void>("/api/matches/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}



