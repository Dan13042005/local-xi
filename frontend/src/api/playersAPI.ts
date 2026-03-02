import type { Player } from "../models/Players";
import { apiFetch } from "./http";

export function getPlayers(): Promise<Player[]> {
  return apiFetch<Player[]>("/api/players");
}

export function createPlayer(player: Omit<Player, "id">): Promise<Player> {
  return apiFetch<Player>("/api/players", {
    method: "POST",
    body: JSON.stringify(player),
  });
}

export function deletePlayers(ids: number[]): Promise<void> {
  return apiFetch<void>("/api/players/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}



