import { useEffect, useMemo, useState } from "react";
import { createNotice, deleteNotice, getNotices, type Notice } from "../api/noticesAPI";

function sortNewestFirst(notices: Notice[]) {
  return [...notices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function Notices() {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const role = localStorage.getItem("role") || "";
  const isManager = useMemo(() => role === "MANAGER", [role]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotices();
      setItems(sortNewestFirst(data));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load notices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const created = await createNotice({
        title: title.trim(),
        body: body.trim(),
      });

      setItems((prev) => sortNewestFirst([created, ...prev]));
      setTitle("");
      setBody("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create notice");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this notice?")) return;

    setError(null);
    try {
      await deleteNotice(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete notice");
    }
  }

  return (
    <div>
      <h2>Notices</h2>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      {isManager && (
        <form
          onSubmit={onCreate}
          style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}
        >
          <h3 style={{ marginTop: 0 }}>Post a notice</h3>

          <div style={{ marginBottom: 10 }}>
            <label>Title</label>
            <input
              style={{ width: "100%", padding: 10 }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Training moved to Wednesday"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Message</label>
            <textarea
              style={{ width: "100%", padding: 10, minHeight: 90 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the notice..."
            />
          </div>

          <button type="submit" disabled={saving || !title.trim() || !body.trim()}>
            {saving ? "Posting..." : "Post notice"}
          </button>
        </form>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <div>No notices yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((n) => (
            <div key={n.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{n.title}</strong>
                <small style={{ opacity: 0.75 }}>{new Date(n.createdAt).toLocaleString()}</small>
              </div>

              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{n.body}</div>

              {isManager && (
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => onDelete(n.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={load}>Refresh</button>
      </div>
    </div>
  );
}