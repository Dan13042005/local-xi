import type { Formation } from "../models/Formation";
import { apiFetch } from "./http";

export function getFormations(): Promise<Formation[]> {
  return apiFetch<Formation[]>("/api/formations");
}

export function createFormation(payload: Omit<Formation, "id">): Promise<Formation> {
  return apiFetch<Formation>("/api/formations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFormation(
  id: number,
  patch: Partial<Omit<Formation, "id">>
): Promise<Formation> {
  return apiFetch<Formation>(`/api/formations/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteFormations(ids: number[]): Promise<void> {
  return apiFetch<void>("/api/formations/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
