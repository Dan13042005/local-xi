import { useEffect, useMemo, useState } from "react";
import type { Match } from "../models/Match";
import { createMatch, deleteMatches, getMatches } from "../api/matchesAPI";

type ParsedNumber = {
  value: number | null; // null means "left blank"
  valid: boolean; // false means "user typed something invalid"
};

function parseOptionalNonNegativeInt(raw: string): ParsedNumber {
  const trimmed = raw.trim();

  // blank is allowed
  if (trimmed === "") return { value: null, valid: true };

  // only whole numbers 0+
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return { value: null, valid: false };

  return { value: n, valid: true };
}

export function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [date, setDate] = useState<string>("");
  const [opponent, setOpponent] = useState<string>("");
  const [home, setHome] = useState<boolean>(true);
  const [goalsFor, setGoalsFor] = useState<string>("");
  const [goalsAgainst, setGoalsAgainst] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string>("");

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

  if (loading) return <p>Loading matches...</p>;

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
            <select
              value={home ? "home" : "away"}
              onChange={(e) => setHome(e.target.value === "home")}
            >
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

          <button type="submit" className="primary" disabled={!canSubmit}>
            Add Match
          </button>

          {!canSubmit && !error && submitHint ? <p className="error">{submitHint}</p> : null}

          <button
            type="button"
            className="danger"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
          >
            Delete Selected ({selectedIds.length})
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </form>

      {/* ✅ UPCOMING FIXTURES */}
      <h3 style={{ marginTop: "1rem" }}>Upcoming Fixtures</h3>
      {fixtures.length === 0 ? (
        <p>No upcoming fixtures yet.</p>
      ) : (
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
            </tr>
          </thead>

          <tbody>
            {fixtures.map((m) => (
              <tr key={m.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleSelected(m.id)}
                  />
                </td>
                <td>{m.date}</td>
                <td>{m.opponent}</td>
                <td>{m.home ? "H" : "A"}</td>
                <td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ✅ RESULTS */}
      <h3 style={{ marginTop: "2rem" }}>Results</h3>
      {results.length === 0 ? (
        <p>No results yet.</p>
      ) : (
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
            </tr>
          </thead>

          <tbody>
            {results.map((m) => (
              <tr key={m.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleSelected(m.id)}
                  />
                </td>
                <td>{m.date}</td>
                <td>{m.opponent}</td>
                <td>{m.home ? "H" : "A"}</td>
                <td>{formatResult(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}






