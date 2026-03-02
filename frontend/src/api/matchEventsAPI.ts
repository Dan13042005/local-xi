import type { MatchEvent } from "../models/MatchEvent";
import { apiFetch } from "./http";

export function getMatchEventsForMatch(matchId: number): Promise<MatchEvent[]> {
  return apiFetch<MatchEvent[]>(`/api/match-events/match/${matchId}`);
}

export function saveMatchEventsForMatch(
  matchId: number,
  events: MatchEvent[]
): Promise<MatchEvent[]> {
  return apiFetch<MatchEvent[]>(`/api/match-events/match/${matchId}`, {
    method: "PUT",
    body: JSON.stringify(events),
  });
}

export function recomputeMatchFromEvents(matchId: number): Promise<void> {
  return apiFetch<void>(`/api/match-events/match/${matchId}/recompute`, {
    method: "POST",
  });
}