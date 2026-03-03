import type { Match } from "../models/Match";
import { apiFetch } from "./http";

export async function getMatches(): Promise<Match[]> {
  return apiFetch<Match[]>("/api/matches");
}

export async function createMatch(payload: Omit<Match, "id">): Promise<Match> {
  return apiFetch<Match>("/api/matches", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateMatch(id: number, patch: Partial<Match>): Promise<Match> {
  return apiFetch<Match>(`/api/matches/${id}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteMatches(ids: number[]): Promise<void> {
  await apiFetch<void>("/api/matches/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}



