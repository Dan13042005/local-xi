import { useEffect, useMemo, useState } from "react";
import type { Player } from "../models/Players";
import { createPlayer, deletePlayers, getPlayers } from "../api/playersAPI";
import { getPlayerTotals, type PlayerTotals } from "../api/playerStatsAPI";

const POSITIONS = [
  "GK",
  "LB",
  "RB",
  "CB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST",
];

function getErrorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Something went wrong.";
}

export function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(["CM"]);
  const [number, setNumber] = useState<number>(10);
  const [error, setError] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ✅ totals cache keyed by playerId
  const [totalsById, setTotalsById] = useState<Record<number, PlayerTotals>>({});
  const [totalsLoadingById, setTotalsLoadingById] = useState<Record<number, boolean>>({});

  async function refreshPlayers() {
    try {
      const data = await getPlayers();

      // keep UI consistent
      const sorted = [...data].sort((a, b) => a.number - b.number);
      setPlayers(sorted);

      // if some selected IDs no longer exist, remove them
      const validIds = new Set(sorted.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));

      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  // ✅ public totals refresh (button + focus-trigger)
  async function refreshTotals() {
    const ids = players.map((p) => p.id);
    if (ids.length === 0) return;

    // mark loading for all
    setTotalsLoadingById((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = true;
      return next;
    });

    const results = await Promise.allSettled(ids.map((id) => getPlayerTotals(id)));

    // store successes
    setTotalsById((prev) => {
      const next = { ...prev };
      results.forEach((res, idx) => {
        const id = ids[idx];
        if (res.status === "fulfilled") next[id] = res.value;
      });
      return next;
    });

    // clear loading for all
    setTotalsLoadingById((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = false;
      return next;
    });
  }

  // Load players once on page load
  useEffect(() => {
    (async () => {
      try {
        await refreshPlayers();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Fetch totals for players we haven't loaded yet (stable; won't get stuck)
  useEffect(() => {
    let cancelled = false;

    const idsToFetch = players
      .map((p) => p.id)
      .filter((id) => totalsById[id] == null);

    if (idsToFetch.length === 0) return;

    // mark loading for these ids
    setTotalsLoadingById((prev) => {
      const next = { ...prev };
      for (const id of idsToFetch) next[id] = true;
      return next;
    });

    (async () => {
      const results = await Promise.allSettled(idsToFetch.map((id) => getPlayerTotals(id)));
      if (cancelled) return;

      setTotalsById((prev) => {
        const next = { ...prev };
        results.forEach((res, idx) => {
          const id = idsToFetch[idx];
          if (res.status === "fulfilled") next[id] = res.value;
        });
        return next;
      });

      setTotalsLoadingById((prev) => {
        const next = { ...prev };
        for (const id of idsToFetch) next[id] = false;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [players, totalsById]);

  // ✅ When you come back to the window/tab, refresh totals
  useEffect(() => {
    const onFocus = () => {
      // refresh totals when returning from Matches page after saving
      refreshTotals().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  function toggleSelected(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? players.map((p) => p.id) : []);
  }

  async function handleDeleteSelected() {
    setError("");

    if (selectedIds.length === 0) {
      setError("Select at least one player to delete.");
      return;
    }

    try {
      await deletePlayers(selectedIds);

      // remove deleted totals from cache
      setTotalsById((prev) => {
        const next = { ...prev };
        for (const id of selectedIds) delete next[id];
        return next;
      });

      setTotalsLoadingById((prev) => {
        const next = { ...prev };
        for (const id of selectedIds) delete next[id];
        return next;
      });

      setSelectedIds([]);
      await refreshPlayers();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  // ---------- disable Add Player until form is valid ----------
  const trimmedName = name.trim();
  const numberAsNumber = Number(number);

  const numberTaken = players.some((p) => p.number === numberAsNumber);

  const canSubmit =
    trimmedName.length > 0 &&
    selectedPositions.length > 0 &&
    Number.isInteger(numberAsNumber) &&
    numberAsNumber >= 1 &&
    numberAsNumber <= 99 &&
    !numberTaken &&
    !loading;

  const submitHint =
    trimmedName.length === 0
      ? "Enter a name."
      : selectedPositions.length === 0
      ? "Select at least one position."
      : !Number.isInteger(numberAsNumber) || numberAsNumber < 1 || numberAsNumber > 99
      ? "Shirt number must be 1–99."
      : numberTaken
      ? "That shirt number is already taken."
      : "";
  // ---------------------------------------------------------------

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!canSubmit) return;

    try {
      await createPlayer({
        name: trimmedName,
        positions: selectedPositions,
        number: numberAsNumber,
      });

      setName("");
      setSelectedPositions(["CM"]);
      setNumber(10);
      setSelectedIds([]);

      await refreshPlayers();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  const allSelected = players.length > 0 && selectedIds.length === players.length;
  const totalsHeader = useMemo(() => "Career totals (G/A/YC/RC)", []);

  function renderTotals(playerId: number) {
    if (totalsLoadingById[playerId]) return "…";
    const t = totalsById[playerId];
    if (!t) return "⚽ 0  🅰️ 0  🟨 0  🟥 0";
    return `⚽ ${t.goals}  🅰️ ${t.assists}  🟨 ${t.yellowCards}  🟥 ${t.redCards}`;
  }

  if (loading) return <p>Loading players...</p>;

  return (
    <section>
      <h2>Players</h2>

      <form className="card" onSubmit={addPlayer}>
        <div className="form-row">
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dan Smith"
            />
          </label>

          <label>
            Positions
            <div className="checkbox-grid">
              {POSITIONS.map((pos) => (
                <label key={pos} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedPositions.includes(pos)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPositions((prev) => [...prev, pos]);
                      } else {
                        setSelectedPositions((prev) => prev.filter((p) => p !== pos));
                      }
                    }}
                  />
                  <span>{pos}</span>
                </label>
              ))}
            </div>
          </label>

          <label>
            Shirt No.
            <input
              type="number"
              value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
              min={1}
              max={99}
            />
          </label>

          <button type="submit" className="primary" disabled={!canSubmit}>
            Add Player
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

      {/* ✅ Manual refresh for totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button type="button" onClick={refreshTotals}>
          Refresh Totals
        </button>
      </div>

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
            <th>No.</th>
            <th>Name</th>
            <th>Positions</th>
            <th title={totalsHeader}>Totals</th>
          </tr>
        </thead>

        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(player.id)}
                  onChange={() => toggleSelected(player.id)}
                />
              </td>
              <td>{player.number}</td>
              <td>{player.name}</td>
              <td>{player.positions.join(", ")}</td>
              <td style={{ whiteSpace: "nowrap" }}>{renderTotals(player.id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
