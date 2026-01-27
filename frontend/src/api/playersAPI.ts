import type { Player } from "../models/Players";

const API_MODE = (import.meta.env.VITE_API_MODE ?? "local") as "local" | "api";
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080") as string;

const STORAGE_KEY = "localxi_players";

// ---------- Local (temporary) storage helpers ----------
function loadLocalPlayers(): Player[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Player[];
  } catch {
    return [];
  }
}

function saveLocalPlayers(players: Player[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

// ---------- API functions (you will build these endpoints later) ----------
async function apiGetPlayers(): Promise<Player[]> {
  const res = await fetch(`${BASE_URL}/api/players`);
  if (!res.ok) throw new Error(`GET /api/players failed (${res.status})`);
  return (await res.json()) as Player[];
}

async function apiCreatePlayer(player: Omit<Player, "id">): Promise<Player> {
  const res = await fetch(`${BASE_URL}/api/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(player),
  });
  if (!res.ok) throw new Error(`POST /api/players failed (${res.status})`);
  return (await res.json()) as Player;
}

async function apiDeletePlayers(ids: number[]): Promise<void> {
  // We’ll implement this exact endpoint later in Spring Boot.
  const res = await fetch(`${BASE_URL}/api/players/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`POST /api/players/bulk-delete failed (${res.status})`);
}

// ---------- Public functions your UI will call ----------
export async function getPlayers(): Promise<Player[]> {
  if (API_MODE === "api") return apiGetPlayers();
  return loadLocalPlayers();
}

export async function createPlayer(player: Omit<Player, "id">): Promise<Player> {
  if (API_MODE === "api") return apiCreatePlayer(player);

  const players = loadLocalPlayers();
  const nextId = players.reduce((max, p) => Math.max(max, p.id), 0) + 1;

  const created: Player = { id: nextId, ...player };
  players.push(created);
  saveLocalPlayers(players);

  return created;
}

export async function deletePlayers(ids: number[]): Promise<void> {
  if (API_MODE === "api") return apiDeletePlayers(ids);

  const players = loadLocalPlayers().filter((p) => !ids.includes(p.id));
  saveLocalPlayers(players);
}
