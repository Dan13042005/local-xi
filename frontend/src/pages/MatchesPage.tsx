import { useEffect, useMemo, useState } from "react";
import type { Match } from "../models/Match";
import { createMatch, deleteMatches, getMatches, updateMatch } from "../api/matchesAPI";

type ParsedNumber = { value: number | null; valid: boolean };

function parseOptionalNonNegativeInt(raw: string): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, valid: true };

  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return { value: null, valid: false };

  return { value: n, valid: true };
}

type VenueFilter = "all" | "home" | "away";

type ScoreDraft = {
  gf: string;
  ga: string;
};

type EditDraft = {
  date: string;
  opponent: string;
  home: boolean;
  gf: string; // keep as string so empty is allowed
  ga: string;
};

function isResult(m: Match) {
  return m.goalsFor != null && m.goalsAgainst != null;
}

export function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // create form state
  const [date, setDate] = useState<string>("");
  const [opponent, setOpponent] = useState<string>("");
  const [home, setHome] = useState<boolean>(true);
  const [goalsFor, setGoalsFor] = useState<string>("");
  const [goalsAgainst, setGoalsAgainst] = useState<string>("");

  // selection + errors
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string>("");

  // filter
  const [query, setQuery] = useState<string>("");
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all");

  // ✅ E2.3 mark-as-played drafts per fixture id
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, ScoreDraft>>({});

  // ✅ E2.4 edit mode
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  async function refreshMatches() {
    try {
      const data = await getMatches();

      // sort by date desc (newest first); if same date, opponent A-Z
      const sorted = [...data].sort((a, b) => {
        if (a.date === b.date) return a.opponent.localeCompare(b.opponent);
        return b.date.localeCompare(a.date);
      });

      setMatches(sorted);

      // keep selection valid (against full data)
      const valid = new Set(sorted.map((m) => m.id));
      setSelectedIds((prev) => prev.filter((id) => valid.has(id)));

      // clean score drafts if match vanished
      setScoreDrafts((prev) => {
        const next: Record<number, ScoreDraft> = {};
        for (const k of Object.keys(prev)) {
          const id = Number(k);
          if (valid.has(id)) next[id] = prev[id];
        }
        return next;
      });

      // if editing something that vanished, exit edit mode
      if (editId != null && !valid.has(editId)) {
        setEditId(null);
        setEditDraft(null);
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
  }, []);

  // -------- selection helpers --------
  function toggleSelected(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // merge or remove a set of IDs
  function toggleMany(ids: number[], checked: boolean) {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (checked) {
        ids.forEach((id) => set.add(id));
      } else {
        ids.forEach((id) => set.delete(id));
      }
      return Array.from(set);
    });
  }
  // ----------------------------------

  // ---------- create validation ----------
  const trimmedOpponent = opponent.trim();

  const goalsForParsed = useMemo(() => parseOptionalNonNegativeInt(goalsFor), [goalsFor]);
  const goalsAgainstParsed = useMemo(() => parseOptionalNonNegativeInt(goalsAgainst), [goalsAgainst]);

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
  // --------------------------------------

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!canSubmit) return;

    try {
      await createMatch({
        date,
        opponent: trimmedOpponent,
        home,
        goalsFor: goalsForParsed.value,
        goalsAgainst: goalsAgainstParsed.value,
      });

      // reset
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

  // ---------- filtered view ----------
  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();

    return matches.filter((m) => {
      if (venueFilter === "home" && !m.home) return false;
      if (venueFilter === "away" && m.home) return false;

      if (!q) return true;

      const opponentText = (m.opponent ?? "").toLowerCase();
      const dateText = (m.date ?? "").toLowerCase();
      const scoreText =
        m.goalsFor == null || m.goalsAgainst == null ? "" : `${m.goalsFor}-${m.goalsAgainst}`;

      return opponentText.includes(q) || dateText.includes(q) || scoreText.includes(q);
    });
  }, [matches, query, venueFilter]);

  const fixtures = useMemo(() => {
    return filteredMatches
      .filter((m) => !isResult(m))
      .sort((a, b) => a.date.localeCompare(b.date)); // soonest first
  }, [filteredMatches]);

  const results = useMemo(() => {
    return filteredMatches
      .filter((m) => isResult(m))
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }, [filteredMatches]);

  const fixtureIds = useMemo(() => fixtures.map((m) => m.id), [fixtures]);
  const resultIds = useMemo(() => results.map((m) => m.id), [results]);

  const allFixturesSelected =
    fixtureIds.length > 0 && fixtureIds.every((id) => selectedIds.includes(id));
  const allResultsSelected =
    resultIds.length > 0 && resultIds.every((id) => selectedIds.includes(id));

  // ---------- E2.3: mark as played ----------
  function getScoreDraft(id: number): ScoreDraft {
    return scoreDrafts[id] ?? { gf: "", ga: "" };
  }

  function setScoreDraft(id: number, next: ScoreDraft) {
    setScoreDrafts((prev) => ({ ...prev, [id]: next }));
  }

  function validateScoreDraft(d: ScoreDraft): string | null {
    const gf = parseOptionalNonNegativeInt(d.gf);
    const ga = parseOptionalNonNegativeInt(d.ga);

    // For "mark played" we REQUIRE both numbers
    if (d.gf.trim() === "" || d.ga.trim() === "") return "Enter both scores.";
    if (!gf.valid || !ga.valid) return "Scores must be whole numbers 0 or more.";

    return null;
  }

  async function handleMarkPlayed(id: number) {
    setError("");

    const d = getScoreDraft(id);
    const message = validateScoreDraft(d);
    if (message) {
      setError(message);
      return;
    }

    const gf = Number(d.gf.trim());
    const ga = Number(d.ga.trim());

    try {
      await updateMatch(id, { goalsFor: gf, goalsAgainst: ga });
      // clear draft after save
      setScoreDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await refreshMatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark match as played.");
    }
  }
  // ----------------------------------------

  // ---------- E2.4: edit match ----------
  function startEdit(m: Match) {
    setError("");
    setEditId(m.id);
    setEditDraft({
      date: m.date ?? "",
      opponent: m.opponent ?? "",
      home: !!m.home,
      gf: m.goalsFor == null ? "" : String(m.goalsFor),
      ga: m.goalsAgainst == null ? "" : String(m.goalsAgainst),
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditDraft(null);
  }

  function validateEditDraft(d: EditDraft): string | null {
    if (d.date.trim() === "") return "Date is required.";
    if (d.opponent.trim() === "") return "Opponent is required.";

    // goals are optional, but if one is filled then the other must be filled
    const gfRaw = d.gf.trim();
    const gaRaw = d.ga.trim();

    const gf = parseOptionalNonNegativeInt(gfRaw);
    const ga = parseOptionalNonNegativeInt(gaRaw);

    if (!gf.valid) return "Goals For must be a whole number 0 or more (or blank).";
    if (!ga.valid) return "Goals Against must be a whole number 0 or more (or blank).";

    const oneFilled = gfRaw !== "" || gaRaw !== "";
    const bothFilled = gfRaw !== "" && gaRaw !== "";
    if (oneFilled && !bothFilled) return "Enter both scores, or leave both blank.";

    return null;
  }

  async function saveEdit() {
    if (editId == null || editDraft == null) return;

    setError("");

    const msg = validateEditDraft(editDraft);
    if (msg) {
      setError(msg);
      return;
    }

    const gfRaw = editDraft.gf.trim();
    const gaRaw = editDraft.ga.trim();

    const patch: Partial<Omit<Match, "id">> = {
      date: editDraft.date.trim(),
      opponent: editDraft.opponent.trim(),
      home: editDraft.home,
      goalsFor: gfRaw === "" ? null : Number(gfRaw),
      goalsAgainst: gaRaw === "" ? null : Number(gaRaw),
    };

    try {
      await updateMatch(editId, patch);
      cancelEdit();
      await refreshMatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update match.");
    }
  }
  // ------------------------------------

  if (loading) return <p>Loading matches...</p>;

  return (
    <section>
      <h2>Matches</h2>

      {/* Filter */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Filter</h3>
        <div className="form-row">
          <label>
            Search
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search opponent, date (YYYY-MM-DD), or score (e.g. 2-1)"
            />
          </label>

          <label>
            Venue
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value as VenueFilter)}
            >
              <option value="all">All</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </label>

          <button
            type="button"
            className="danger"
            onClick={() => {
              setQuery("");
              setVenueFilter("all");
            }}
            disabled={query.trim() === "" && venueFilter === "all"}
          >
            Clear Filter
          </button>

          <button
            type="button"
            className="danger"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
          >
            Delete Selected ({selectedIds.length})
          </button>
        </div>

        <p style={{ marginTop: 8, opacity: 0.75 }}>
          Showing <strong>{filteredMatches.length}</strong> of <strong>{matches.length}</strong> matches.
        </p>

        {error ? <p className="error">{error}</p> : null}
      </div>

      {/* Add match */}
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

          <button type="submit" className="primary" disabled={!canSubmit}>
            Add Match
          </button>

          {!canSubmit && submitHint ? <p className="error">{submitHint}</p> : null}
        </div>
      </form>

      {/* Fixtures */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
        <h3 style={{ margin: 0 }}>Upcoming Fixtures</h3>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={allFixturesSelected}
            onChange={(e) => toggleMany(fixtureIds, e.target.checked)}
            disabled={fixtureIds.length === 0}
          />
          Select all fixtures
        </label>
      </div>

      {fixtures.length === 0 ? (
        <p>No upcoming fixtures match your filter.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Date</th>
              <th>Opponent</th>
              <th>H/A</th>
              <th>Result</th>
              <th>Mark Played</th>
              <th>Edit</th>
            </tr>
          </thead>

          <tbody>
            {fixtures.map((m) => {
              const d = getScoreDraft(m.id);
              const draftError = validateScoreDraft(d);

              return (
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

                  <td>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={d.gf}
                        onChange={(e) => setScoreDraft(m.id, { ...d, gf: e.target.value })}
                        placeholder="GF"
                        style={{ width: 80 }}
                      />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={d.ga}
                        onChange={(e) => setScoreDraft(m.id, { ...d, ga: e.target.value })}
                        placeholder="GA"
                        style={{ width: 80 }}
                      />
                      <button
                        type="button"
                        className="primary"
                        onClick={() => handleMarkPlayed(m.id)}
                        disabled={!!draftError}
                      >
                        Save
                      </button>
                    </div>
                  </td>

                  <td>
                    <button type="button" onClick={() => startEdit(m)}>
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Results */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2rem" }}>
        <h3 style={{ margin: 0 }}>Results</h3>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={allResultsSelected}
            onChange={(e) => toggleMany(resultIds, e.target.checked)}
            disabled={resultIds.length === 0}
          />
          Select all results
        </label>
      </div>

      {results.length === 0 ? (
        <p>No results match your filter.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Date</th>
              <th>Opponent</th>
              <th>H/A</th>
              <th>Result</th>
              <th>Edit</th>
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
                <td>
                  <button type="button" onClick={() => startEdit(m)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ✅ Inline edit panel */}
      {editId != null && editDraft != null ? (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Edit Match (ID: {editId})</h3>

          <div className="form-row">
            <label>
              Date
              <input
                type="date"
                value={editDraft.date}
                onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
              />
            </label>

            <label>
              Opponent
              <input
                value={editDraft.opponent}
                onChange={(e) => setEditDraft({ ...editDraft, opponent: e.target.value })}
              />
            </label>

            <label>
              Venue
              <select
                value={editDraft.home ? "home" : "away"}
                onChange={(e) => setEditDraft({ ...editDraft, home: e.target.value === "home" })}
              >
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </label>

            <label>
              Goals For (blank = fixture)
              <input
                type="number"
                min={0}
                step={1}
                value={editDraft.gf}
                onChange={(e) => setEditDraft({ ...editDraft, gf: e.target.value })}
              />
            </label>

            <label>
              Goals Against (blank = fixture)
              <input
                type="number"
                min={0}
                step={1}
                value={editDraft.ga}
                onChange={(e) => setEditDraft({ ...editDraft, ga: e.target.value })}
              />
            </label>

            <button type="button" className="primary" onClick={saveEdit}>
              Save Changes
            </button>

            <button type="button" className="danger" onClick={cancelEdit}>
              Cancel
            </button>
          </div>

          {error ? <p className="error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}








