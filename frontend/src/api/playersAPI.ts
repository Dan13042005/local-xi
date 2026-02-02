import type { Player } from "../models/Players";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not defined");
}

export async function getPlayers(): Promise<Player[]> {
  const res = await fetch(`${BASE_URL}/api/players`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createPlayer(player: Omit<Player, "id">): Promise<Player> {
  const res = await fetch(`${BASE_URL}/api/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(player),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deletePlayers(ids: number[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/players/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) throw new Error(await res.text());
}



