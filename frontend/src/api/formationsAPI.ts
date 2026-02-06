import type { Formation } from "../models/Formation.ts";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080") as string;

function asTextOrJsonError(res: Response): Promise<string> {
  return res.text().then((t) => t || `${res.status} ${res.statusText}`);
}

export async function getFormations(): Promise<Formation[]> {
  const res = await fetch(`${BASE_URL}/api/formations`);
  if (!res.ok) throw new Error(await asTextOrJsonError(res));
  return (await res.json()) as Formation[];
}

export async function createFormation(payload: Omit<Formation, "id">): Promise<Formation> {
  const res = await fetch(`${BASE_URL}/api/formations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await asTextOrJsonError(res));
  return (await res.json()) as Formation;
}

export async function updateFormation(
  id: number,
  patch: Partial<Omit<Formation, "id">>
): Promise<Formation> {
  const res = await fetch(`${BASE_URL}/api/formations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await asTextOrJsonError(res));
  return (await res.json()) as Formation;
}

export async function deleteFormations(ids: number[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/formations/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(await asTextOrJsonError(res));
}
