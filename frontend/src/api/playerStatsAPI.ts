import { apiFetch } from "./http";

export type PlayerTotals = {
  playerId: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export function getPlayerTotals(playerId: number): Promise<PlayerTotals> {
  return apiFetch<PlayerTotals>(`/api/player-stats/${playerId}/totals`);
}