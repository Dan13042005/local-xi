import { useEffect, useState } from "react";
import type { Player } from "../models/Players";
import { createPlayer, deletePlayers, getPlayers } from "../api/playersAPI";

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

export function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(["CM"]);
  const [number, setNumber] = useState<number>(10);
  const [error, setError] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  async function refreshPlayers() {
    try {
      const data = await getPlayers();
      // keep UI consistent
      const sorted = [...data].sort((a, b) => a.number - b.number);
      setPlayers(sorted);

      // if some selected IDs no longer exist, remove them
      const validIds = new Set(sorted.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
    } catch (e) {
      setError("Failed to load players. Please refresh and try again.");
    }
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
  }, []);

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
      setSelectedIds([]);
      await refreshPlayers();
    } catch (e) {
      setError("Failed to delete players. Please try again.");
    }
  }

  // ---------- B1: disable Add Player until form is valid ----------
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

    // extra safety: button should block it, but this prevents any edge case
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
      setError("Failed to add player. Please try again.");
    }
  }

  const allSelected = players.length > 0 && selectedIds.length === players.length;

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

          {/* optional hint shown only when button is disabled and no backend error is being shown */}
          {!canSubmit && !error && submitHint ? (
            <p className="error">{submitHint}</p>
          ) : null}

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
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}





