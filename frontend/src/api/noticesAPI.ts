import { apiFetch } from "./http";

export type Notice = {
  id: number;
  title: string;
  body: string;
  createdAt: string; // ISO
};

export function getNotices(): Promise<Notice[]> {
  return apiFetch<Notice[]>("/api/notices");
}

export function createNotice(payload: { title: string; body: string }): Promise<Notice> {
  return apiFetch<Notice>("/api/notices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteNotice(id: number): Promise<void> {
  return apiFetch<void>(`/api/notices/${id}`, { method: "DELETE" });
}