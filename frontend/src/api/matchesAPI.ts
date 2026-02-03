import type { Match } from "../models/Match";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080") as string;

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  return text || `Request failed (${res.status})`;
}

export async function getMatches(): Promise<Match[]> {
  const res = await fetch(`${BASE_URL}/api/matches`);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Match[];
}

export async function createMatch(match: Omit<Match, "id">): Promise<Match> {
  const res = await fetch(`${BASE_URL}/api/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(match),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Match;
}

export async function deleteMatches(ids: number[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/matches/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
