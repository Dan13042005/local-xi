import type { Formation } from "../models/Formation";
import { apiFetch } from "./http";

export async function getFormations(): Promise<Formation[]> {
  return apiFetch<Formation[]>("/api/formations");
}

export async function createFormation(payload: Omit<Formation, "id">): Promise<Formation> {
  return apiFetch<Formation>("/api/formations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFormation(id: number, patch: Partial<Formation>): Promise<Formation> {
  return apiFetch<Formation>(`/api/formations/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteFormations(ids: number[]): Promise<void> {
  await apiFetch<void>("/api/formations/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
