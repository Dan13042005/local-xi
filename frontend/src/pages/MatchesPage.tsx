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
  goalsFor: string; // string for typing/editing
  goalsAgainst: string;
};

type VenueFilter = "all" | "home" | "away";

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

  // ✅ G1: filters
  const [query, setQuery] = useState<string>("");
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all");

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

  // ✅ Select-all that works per table (visible rows)
  function isAllSelectedFor(rows: Match[]) {
    if (rows.length === 0) return false;
    const ids = rows.map((m) => m.id);
    return ids.every((id) => selectedIds.includes(id));
  }

  function toggleSelectAllFor(rows: Match[], checked: boolean) {
    const ids = rows.map((m) => m.id);
    setSelectedIds((prev) => {
      if (checked) {
        const merged = new Set([...prev, ...ids]);
        return Array.from(merged);
      }
      // unchecked => remove these ids
      return prev.filter((id) => !ids.includes(id));
    });
  }

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

  // ---------- F4 helpers ----------
  function computeStats(list: Match[]) {
    const played = list.length;

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let gf = 0;
    let ga = 0;

    for (const m of list) {
      const gFor = m.goalsFor ?? 0;
      const gAgainst = m.goalsAgainst ?? 0;

      gf += gFor;
      ga += gAgainst;

      if (gFor > gAgainst) wins++;
      else if (gFor === gAgainst) draws++;
      else losses++;
    }

    const gd = gf - ga;
    const points = wins * 3 + draws;

    return { played, wins, draws, losses, gf, ga, gd, points };
  }

  function resultLabel(m: Match): "W" | "D" | "L" | "—" {
    if (m.goalsFor == null || m.goalsAgainst == null) return "—";
    if (m.goalsFor > m.goalsAgainst) return "W";
    if (m.goalsFor === m.goalsAgainst) return "D";
    return "L";
  }

  function venueLabel(m: Match) {
    return m.home ? "H" : "A";
  }
  // -----------------------------

  // ✅ G1: filter matches first, then split into fixtures/results
  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();

    return matches.filter((m) => {
      // venue
      if (venueFilter === "home" && !m.home) return false;
      if (venueFilter === "away" && m.home) return false;

      if (q.length === 0) return true;

      const score =
        m.goalsFor != null && m.goalsAgainst != null ? `${m.goalsFor}-${m.goalsAgainst}` : "";
      const haystack = `${m.opponent} ${m.date} ${score}`.toLowerCase();

      return haystack.includes(q);
    });
  }, [matches, query, venueFilter]);

  const fixtures = useMemo(() => {
    return filteredMatches
      .filter((m) => m.goalsFor == null || m.goalsAgainst == null)
      .sort((a, b) => a.date.localeCompare(b.date)); // soonest first
  }, [filteredMatches]);

  const results = useMemo(() => {
    return filteredMatches
      .filter((m) => m.goalsFor != null && m.goalsAgainst != null)
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }, [filteredMatches]);

  // ✅ F4: season summary + recent form (based on filtered results)
  const seasonStats = useMemo(() => computeStats(results), [results]);
  const recentForm = useMemo(() => results.slice(0, 5), [results]);

  // ---------- inline edit helpers ----------
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
  // ---------------------------------------

  function clearFilters() {
    setQuery("");
    setVenueFilter("all");
  }

  if (loading) return <p>Loading matches...</p>;

  function renderTable(rows: Match[], tableKey: "fixtures" | "results") {
    const allSelectedForThisTable = isAllSelectedFor(rows);

    return (
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelectedForThisTable}
                onChange={(e) => toggleSelectAllFor(rows, e.target.checked)}
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
              <tr key={`${tableKey}-${m.id}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleSelected(m.id)}
                    disabled={saving}
                  />
                </td>

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
                    m.home ? "H" : "A"
                  )}
                </td>

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

  const showingCount = fixtures.length + results.length;
  const totalCount = matches.length;
  const filtersActive = query.trim().length > 0 || venueFilter !== "all";

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

      {/* ✅ G1: Search + Venue filter */}
      <div className="card" style={{ marginTop: 12, padding: "12px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
          <label style={{ flex: "1 1 280px" }}>
            Search
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search opponent, date (YYYY-MM-DD), or score (e.g. 2-1)"
            />
          </label>

          <label style={{ width: 180 }}>
            Venue
            <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value as VenueFilter)}>
              <option value="all">All</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </label>

          <button type="button" onClick={clearFilters} disabled={!filtersActive}>
            Clear filters
          </button>
        </div>

        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
          Showing <strong>{showingCount}</strong> of <strong>{totalCount}</strong> matches.
        </div>
      </div>

      {/* ✅ F4: Season Summary + Recent Form (filtered) */}
      <h3 style={{ marginTop: "1rem" }}>Season Summary</h3>
      {results.length === 0 ? (
        <p>No results yet — add scores to fixtures to generate stats.</p>
      ) : (
        <div className="card" style={{ padding: "12px 14px", marginTop: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <div><strong>Played:</strong> {seasonStats.played}</div>
            <div><strong>W:</strong> {seasonStats.wins}</div>
            <div><strong>D:</strong> {seasonStats.draws}</div>
            <div><strong>L:</strong> {seasonStats.losses}</div>
            <div><strong>GF:</strong> {seasonStats.gf}</div>
            <div><strong>GA:</strong> {seasonStats.ga}</div>
            <div><strong>GD:</strong> {seasonStats.gd}</div>
            <div><strong>Points:</strong> {seasonStats.points}</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <strong>Recent form (last {recentForm.length}):</strong>{" "}
            {recentForm.map((m) => (
              <span
                key={m.id}
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.15)",
                  marginLeft: 6,
                  fontSize: 13,
                }}
                title={`${m.date} vs ${m.opponent} (${venueLabel(m)}) ${formatResult(m)}`}
              >
                {resultLabel(m)}
              </span>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ marginTop: "1rem" }}>Upcoming Fixtures</h3>
      {fixtures.length === 0 ? <p>No upcoming fixtures yet.</p> : renderTable(fixtures, "fixtures")}

      <h3 style={{ marginTop: "2rem" }}>Results</h3>
      {results.length === 0 ? <p>No results yet.</p> : renderTable(results, "results")}
    </section>
  );
}











