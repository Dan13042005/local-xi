import type { MatchEvent } from "../models/MatchEvent";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080") as string;

async function asTextOrJsonError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return text || `Request failed (${res.status})`;
}

// GET events for match
export async function getMatchEventsForMatch(matchId: number): Promise<MatchEvent[]> {
  const res = await fetch(`${BASE_URL}/api/match-events/match/${matchId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(await asTextOrJsonError(res));
  return (await res.json()) as MatchEvent[];
}

// PUT replace-all events for match
export async function saveMatchEventsForMatch(matchId: number, events: MatchEvent[]): Promise<MatchEvent[]> {
  const res = await fetch(`${BASE_URL}/api/match-events/match/${matchId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(events),
  });

  if (!res.ok) throw new Error(await asTextOrJsonError(res));
  return (await res.json()) as MatchEvent[];
}