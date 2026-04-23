import { useEffect, useMemo, useState } from "react";
import type { Player } from "../models/Players";
import { createPlayer, deletePlayers, getPlayers } from "../api/playersAPI";
import { getPlayerTotals, type PlayerTotals } from "../api/playerStatsAPI";
import { apiFetch } from "../api/http";

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

  // totals cache keyed by playerId
  const [totalsById, setTotalsById] = useState<Record<number, PlayerTotals>>({});
  const [totalsLoadingById, setTotalsLoadingById] = useState<Record<number, boolean>>({});

  // create player account state
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);

  // role gate (PLAYER = read-only, MANAGER = edit)
  const role = localStorage.getItem("role");
  const isManager = role === "MANAGER";

  async function refreshPlayers() {
    try {
      const data = await getPlayers();
      const sorted = [...data].sort((a, b) => a.number - b.number);
      setPlayers(sorted);
      const validIds = new Set(sorted.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function refreshTotals() {
    const ids = players.map((p) => p.id);
    if (ids.length === 0) return;

    setTotalsLoadingById((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = true;
      return next;
    });

    const results = await Promise.allSettled(ids.map((id) => getPlayerTotals(id)));

    setTotalsById((prev) => {
      const next = { ...prev };
      results.forEach((res, idx) => {
        const id = ids[idx];
        if (res.status === "fulfilled") next[id] = res.value;
      });
      return next;
    });

    setTotalsLoadingById((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = false;
      return next;
    });
  }

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

  useEffect(() => {
    let cancelled = false;

    const idsToFetch = players
      .map((p) => p.id)
      .filter((id) => totalsById[id] == null);

    if (idsToFetch.length === 0) return;

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

  useEffect(() => {
    const onFocus = () => {
      refreshTotals().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  function toggleSelected(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError("");
    setAccountSuccess("");
    setAccountLoading(true);

    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: accountEmail.trim().toLowerCase(),
          password: accountPassword,
          role: "PLAYER",
        }),
      });

      setAccountSuccess(`Player account created for ${accountEmail.trim().toLowerCase()}.`);
      setAccountEmail("");
      setAccountPassword("");
    } catch (e) {
      setAccountError(getErrorMessage(e));
    } finally {
      setAccountLoading(false);
    }
  }

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

      {isManager ? (
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
      ) : null}

      {isManager ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => { setShowAccountForm((v) => !v); setAccountError(""); setAccountSuccess(""); }}
          >
            <strong>Create Player Account</strong>
            <span style={{ opacity: 0.6, fontSize: 13 }}>{showAccountForm ? "▲ Hide" : "▼ Show"}</span>
          </div>

          {showAccountForm ? (
            <form onSubmit={handleCreateAccount} style={{ marginTop: 12 }}>
              <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 12 }}>
                Create a login for a squad member so they can sign in and view the team.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <label style={{ flex: "1 1 200px" }}>
                  Email
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="player@example.com"
                    style={{ width: "100%" }}
                    required
                  />
                </label>

                <label style={{ flex: "1 1 200px" }}>
                  Password (min 8 characters)
                  <input
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    style={{ width: "100%" }}
                    minLength={8}
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="primary"
                  disabled={accountLoading}
                  style={{ alignSelf: "flex-end" }}
                >
                  {accountLoading ? "Creating..." : "Create Account"}
                </button>
              </div>

              {accountError ? <p className="error" style={{ marginTop: 8 }}>{accountError}</p> : null}
              {accountSuccess ? <p style={{ color: "var(--accent)", marginTop: 8 }}>{accountSuccess}</p> : null}
            </form>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button type="button" onClick={refreshTotals}>
          Refresh Totals
        </button>
      </div>

      <table>
        <thead>
          <tr>
            {isManager ? (
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
            ) : null}
            <th>No.</th>
            <th>Name</th>
            <th>Positions</th>
            <th title={totalsHeader}>Totals</th>
          </tr>
        </thead>

        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              {isManager ? (
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(player.id)}
                    onChange={() => toggleSelected(player.id)}
                  />
                </td>
              ) : null}
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
