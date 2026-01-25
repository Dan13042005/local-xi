import { useMemo, useState } from "react";
import type { Player } from "../models/Players";
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

const initialPlayers: Player[] = [
  { id: 1, name: "James Wilson", positions: ["GK"], number: 1 },
  { id: 2, name: "Tom Carter", positions: ["CB"], number: 5 },
  { id: 3, name: "Liam Hughes", positions: ["CM"], number: 8 },
  { id: 4, name: "Ryan Patel", positions: ["ST"], number: 9 },
];


export function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  const [name, setName] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(["CM"]);
  const [number, setNumber] = useState<number>(10);
  const [error, setError] = useState<string>("");

  const nextId = useMemo(() => {
    const maxId = players.reduce((max, p) => Math.max(max, p.id), 0);
    return maxId + 1;
  }, [players]);

  function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = name.trim();

    if (!trimmed) {
  setError("Name is required.");
  return;
}

if (selectedPositions.length === 0) {
  setError("Select at least one position.");
  return;
}

if (!Number.isInteger(number) || number < 1 || number > 99) {
  setError("Shirt number must be a whole number between 1 and 99.");
  return;
}

if (players.some((p) => p.number === number)) {
  setError(`Shirt number ${number} is already taken.`);
  return;
}



    const newPlayer: Player = {
       id: nextId,
       name: trimmed,
       positions: selectedPositions,
       number,
    };


    setPlayers((prev) => [...prev, newPlayer].sort((a, b) => a.number - b.number));
    setName("");
    setSelectedPositions(["CM"]);
    setNumber(10);
  }

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

          <button type="submit" className="primary">
            Add Player
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </form>

      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Name</th>
            <th>Position</th>
          </tr>
        </thead>

        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
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

