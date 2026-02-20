export type PlayerTotals = {
  playerId: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

const BASE = "http://localhost:8080/api/player-stats";

export async function getPlayerTotals(playerId: number): Promise<PlayerTotals> {
  const res = await fetch(`${BASE}/${playerId}/totals`);
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Failed to fetch totals for player ${playerId}`);
  }
  return res.json();
}