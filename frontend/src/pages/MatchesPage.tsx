import { useEffect, useMemo, useState } from "react";
import type { Match } from "../models/Match";
import { createMatch, deleteMatches, getMatches, updateMatch } from "../api/matchesAPI";

type ParsedNumber = {
  value: number | null; // null means blank
  valid: boolean; // false means invalid input
};

function parseOptionalNonNegativeInt(raw: string): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, valid: true };

  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return { value: null, valid: false };

  return { value: n, valid: true };
}

type EditDraft = {
  date: string;
  opponent: string;
  home: boolean;
  goalsFor: string; // keep as string for typing/editing
  goalsAgainst: string;
};

export function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // add form state
  const [date, setDate] = useState<string>("");
  const [opponent, setOpponent] = useState<string>("");
  const [home, setHome] = useState<boolean>(true);
  const [goalsFor, setGoalsFor] = useState<string>("");
  const [goalsAgainst, setGoalsAgainst] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string>("");

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  async function refreshMatches() {
    try {
      const data = await getMatches();

      // Sort by date desc (newest first); if same date, opponent A-Z
      const sorted = [...data].sort((a, b) => {
        if (a.date === b.date) return a.opponent.localeCompare(b.opponent);
        return b.date.localeCompare(a.date);
      });

      setMatches(sorted);

      // Keep selection valid
      const valid = new Set(sorted.map((m) => m.id));
      setSelectedIds((prev) => prev.filter((id) => valid.has(id)));

      // If currently editing a match that no longer exists, exit edit mode
      if (editingId != null && !valid.has(editingId)) {
        setEditingId(null);
        setDraft(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load matches.");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await refreshMatches();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelected(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? matches.map((m) => m.id) : []);
  }

  const allSelected = matches.length > 0 && selectedIds.length === matches.length;

  const trimmedOpponent = opponent.trim();
  const goalsForParsed = useMemo(() => parseOptionalNonNegativeInt(goalsFor), [goalsFor]);
  const goalsAgainstParsed = useMemo(
    () => parseOptionalNonNegativeInt(goalsAgainst),
    [goalsAgainst]
  );

  const canSubmit =
    !loading &&
    date.trim().length > 0 &&
    trimmedOpponent.length > 0 &&
    goalsForParsed.valid &&
    goalsAgainstParsed.valid;

  const submitHint =
    date.trim().length === 0
      ? "Pick a date."
      : trimmedOpponent.length === 0
      ? "Enter an opponent."
      : !goalsForParsed.valid
      ? "Goals For must be a whole number 0 or more (or leave blank)."
      : !goalsAgainstParsed.valid
      ? "Goals Against must be a whole number 0 or more (or leave blank)."
      : "";

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!canSubmit) return;

    try {
      await createMatch({
        date, // yyyy-mm-dd
        opponent: trimmedOpponent,
        home,
        goalsFor: goalsForParsed.value,
        goalsAgainst: goalsAgainstParsed.value,
      });

      // reset form
      setDate("");
      setOpponent("");
      setHome(true);
      setGoalsFor("");
      setGoalsAgainst("");
      setSelectedIds([]);

      await refreshMatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add match.");
    }
  }

  async function handleDeleteSelected() {
    setError("");

    if (selectedIds.length === 0) {
      setError("Select at least one match to delete.");
      return;
    }

    try {
      await deleteMatches(selectedIds);
      setSelectedIds([]);
      await refreshMatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete matches.");
    }
  }

  function formatResult(m: Match) {
    if (m.goalsFor == null || m.goalsAgainst == null) return "—";
    return `${m.goalsFor}–${m.goalsAgainst}`;
  }

  function isResult(m: Match) {
    return m.goalsFor != null && m.goalsAgainst != null;
  }

  function computeStats(list: Match[]) {
    const results = list.filter(isResult);

    const played = results.length;

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let gf = 0;
    let ga = 0;

    for (const m of results) {
      const goalsFor = m.goalsFor ?? 0;
      const goalsAgainst = m.goalsAgainst ?? 0;

      gf += goalsFor;
      ga += goalsAgainst;

      if (goalsFor > goalsAgainst) wins++;
      else if (goalsFor === goalsAgainst) draws++;
      else losses++;
    }

    const gd = gf - ga;
    const points = wins * 3 + draws;

    return { played, wins, draws, losses, gf, ga, gd, points };
  }

  // ✅ F1: actually compute stats so TS stops warning and we can display it
  const stats = useMemo(() => computeStats(matches), [matches]);

  // ✅ Split into Fixtures vs Results
  const fixtures = useMemo(() => {
    return matches
      .filter((m) => m.goalsFor == null || m.goalsAgainst == null)
      .sort((a, b) => a.date.localeCompare(b.date)); // soonest first
  }, [matches]);

  const results = useMemo(() => {
    return matches
      .filter((m) => m.goalsFor != null && m.goalsAgainst != null)
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }, [matches]);

  // ---------- E4: inline edit helpers ----------
  function startEdit(m: Match) {
    setError("");
    setEditingId(m.id);
    setDraft({
      date: m.date,
      opponent: m.opponent,
      home: m.home,
      goalsFor: m.goalsFor == null ? "" : String(m.goalsFor),
      goalsAgainst: m.goalsAgainst == null ? "" : String(m.goalsAgainst),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function isEditing(m: Match) {
    return editingId === m.id && draft != null;
  }

  function validateDraft(d: EditDraft): string {
    if (d.date.trim().length === 0) return "Date is required.";
    if (d.opponent.trim().length === 0) return "Opponent is required.";

    const gf = parseOptionalNonNegativeInt(d.goalsFor);
    if (!gf.valid) return "Goals For must be a whole number 0 or more (or blank).";

    const ga = parseOptionalNonNegativeInt(d.goalsAgainst);
    if (!ga.valid) return "Goals Against must be a whole number 0 or more (or blank).";

    return "";
  }

  async function saveEdit(id: number) {
    if (!draft) return;

    setError("");
    const msg = validateDraft(draft);
    if (msg) {
      setError(msg);
      return;
    }

    const gf = parseOptionalNonNegativeInt(draft.goalsFor);
    const ga = parseOptionalNonNegativeInt(draft.goalsAgainst);

    setSaving(true);
    try {
      await updateMatch(id, {
        date: draft.date.trim(),
        opponent: draft.opponent.trim(),
        home: draft.home,
        goalsFor: gf.value,
        goalsAgainst: ga.value,
      });

      cancelEdit();
      await refreshMatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update match.");
    } finally {
      setSaving(false);
    }
  }
  // -------------------------------------------

  if (loading) return <p>Loading matches...</p>;

  function renderTable(rows: Match[]) {
    return (
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
            </th>
            <th>Date</th>
            <th>Opponent</th>
            <th>H/A</th>
            <th>Result</th>
            <th style={{ width: 180 }}>Edit</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((m) => {
            const editing = isEditing(m);
            const d = editing ? draft! : null;

            return (
              <tr key={m.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleSelected(m.id)}
                    disabled={saving}
                  />
                </td>

                {/* Date */}
                <td>
                  {editing ? (
                    <input
                      type="date"
                      value={d!.date}
                      onChange={(e) =>
                        setDraft((prev) => (prev ? { ...prev, date: e.target.value } : prev))
                      }
                    />
                  ) : (
                    m.date
                  )}
                </td>

                {/* Opponent */}
                <td>
                  {editing ? (
                    <input
                      value={d!.opponent}
                      onChange={(e) =>
                        setDraft((prev) => (prev ? { ...prev, opponent: e.target.value } : prev))
                      }
                    />
                  ) : (
                    m.opponent
                  )}
                </td>

                {/* Venue */}
                <td>
                  {editing ? (
                    <select
                      value={d!.home ? "home" : "away"}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, home: e.target.value === "home" } : prev
                        )
                      }
                    >
                      <option value="home">H</option>
                      <option value="away">A</option>
                    </select>
                  ) : (
                    (m.home ? "H" : "A")
                  )}
                </td>

                {/* Result / scores */}
                <td>
                  {editing ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={d!.goalsFor}
                        onChange={(e) =>
                          setDraft((prev) => (prev ? { ...prev, goalsFor: e.target.value } : prev))
                        }
                        placeholder="GF"
                        style={{ width: 70 }}
                      />
                      <span>–</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={d!.goalsAgainst}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, goalsAgainst: e.target.value } : prev
                          )
                        }
                        placeholder="GA"
                        style={{ width: 70 }}
                      />
                    </div>
                  ) : (
                    formatResult(m)
                  )}
                </td>

                {/* Edit actions */}
                <td>
                  {editing ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => saveEdit(m.id)}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(m)} disabled={saving}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <section>
      <h2>Matches</h2>

      <form className="card" onSubmit={handleAddMatch}>
        <div className="form-row">
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <label>
            Opponent
            <input
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="e.g. Riverside FC"
            />
          </label>

          <label>
            Venue
            <select value={home ? "home" : "away"} onChange={(e) => setHome(e.target.value === "home")}>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </label>

          <label>
            Goals For (optional)
            <input
              type="number"
              min={0}
              step={1}
              value={goalsFor}
              onChange={(e) => setGoalsFor(e.target.value)}
              placeholder="e.g. 2"
            />
          </label>

          <label>
            Goals Against (optional)
            <input
              type="number"
              min={0}
              step={1}
              value={goalsAgainst}
              onChange={(e) => setGoalsAgainst(e.target.value)}
              placeholder="e.g. 1"
            />
          </label>

          <button type="submit" className="primary" disabled={!canSubmit || saving}>
            Add Match
          </button>

          {!canSubmit && !error && submitHint ? <p className="error">{submitHint}</p> : null}

          <button
            type="button"
            className="danger"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || saving}
          >
            Delete Selected ({selectedIds.length})
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </form>

      {/* ✅ F1: Season Summary */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Season Summary</h3>
        <p style={{ margin: 0 }}>
          Played: <strong>{stats.played}</strong> · Wins: <strong>{stats.wins}</strong> · Draws:{" "}
          <strong>{stats.draws}</strong> · Losses: <strong>{stats.losses}</strong>
        </p>
        <p style={{ margin: "0.5rem 0 0" }}>
          GF: <strong>{stats.gf}</strong> · GA: <strong>{stats.ga}</strong> · GD:{" "}
          <strong>{stats.gd}</strong> · Points: <strong>{stats.points}</strong>
        </p>
      </div>

      <h3 style={{ marginTop: "1rem" }}>Upcoming Fixtures</h3>
      {fixtures.length === 0 ? <p>No upcoming fixtures yet.</p> : renderTable(fixtures)}

      <h3 style={{ marginTop: "2rem" }}>Results</h3>
      {results.length === 0 ? <p>No results yet.</p> : renderTable(results)}
    </section>
  );
}











