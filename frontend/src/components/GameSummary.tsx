import { useEffect, useMemo, useState } from "react";
import type { Player } from "../models/Players";
import type { MatchEvent, MatchEventType } from "../models/MatchEvent";
import { getPlayers } from "../api/playersAPI";
import { getMatchEventsForMatch, saveMatchEventsForMatch, recomputeMatchFromEvents } from "../api/matchEventsAPI";

type Props = {
  matchId: number;
};

type LocalEvent = MatchEvent & { _key: string };

function makeKey() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function playerLabel(playerById: Map<number, Player>, id?: number | null) {
  if (id == null) return "—";
  const p = playerById.get(id);
  return p ? `#${p.number} ${p.name}` : `#${id}`;
}

function validateEvent(e: MatchEvent): string {
  if (e.type == null) return "Event type is required.";
  if (e.minute == null) return "Minute is required.";
  if (e.minute < 0 || e.minute > 130) return "Minute must be between 0 and 130.";

  if (e.type === "GOAL") {
    if (e.playerId == null) return "GOAL requires a scorer (player).";
    return "";
  }

  if (e.type === "YELLOW" || e.type === "RED") {
    if (e.playerId == null) return `${e.type} requires a player.`;
    return "";
  }

  if (e.type === "SUB") {
    if (e.playerId == null) return "SUB requires sub ON (player).";
    if (e.relatedPlayerId == null) return "SUB requires sub OFF (related player).";
    if (e.playerId === e.relatedPlayerId) return "SUB ON/OFF must be different players.";
    return "";
  }

  return "";
}

export function GameSummary({ matchId }: Props) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ps, ev] = await Promise.all([getPlayers(), getMatchEventsForMatch(matchId)]);
      setPlayers(ps);
      setEvents(ev.map((e) => ({ ...e, _key: makeKey() })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load match events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.minute === b.minute) return (a.id ?? 0) - (b.id ?? 0);
      return a.minute - b.minute;
    });
  }, [events]);

  function firstPlayerIdOrNull() {
    return players.length > 0 ? players[0].id : null;
  }

  function addEvent(type: MatchEventType) {
    setError("");
    const pid = firstPlayerIdOrNull();

    const blank: LocalEvent = {
      _key: makeKey(),
      matchId,
      minute: 0,
      type,
      playerId: pid,
      relatedPlayerId: type === "SUB" ? pid : null,
      note: null,
    };

    if (type === "SUB" && players.length >= 2) {
      blank.playerId = players[0].id;
      blank.relatedPlayerId = players[1].id;
    }

    setEvents((prev) => [...prev, blank]);
  }

  function removeEvent(key: string) {
    setEvents((prev) => prev.filter((e) => e._key !== key));
  }

  function updateEvent(key: string, patch: Partial<MatchEvent>) {
    setEvents((prev) => prev.map((e) => (e._key === key ? { ...e, ...patch } : e)));
  }

  async function saveAll() {
    setError("");

    for (const e of events) {
      const msg = validateEvent(e);
      if (msg) {
        setError(msg);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: MatchEvent[] = events.map(({ _key, ...rest }) => ({
        ...rest,
        matchId,
      }));

      // 1) save events
      await saveMatchEventsForMatch(matchId, payload);

      // 2) A) recompute Match.goalsFor from GOAL events
      await recomputeMatchFromEvents(matchId);

      // 3) reload events (ids/order)
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save match events.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <strong>Game Summary</strong>
        <div style={{ marginTop: 8 }}>Loading events…</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <strong>Game Summary</strong>
          <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
            Add goals, assists, cards, and subs. Click <strong>Save</strong> to persist.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ opacity: 0.8, fontSize: 13 }}>Match #{matchId}</div>
          <button type="button" className="primary" onClick={saveAll} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? <div style={{ marginTop: 10, color: "crimson", fontWeight: 700 }}>{error}</div> : null}

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => addEvent("GOAL")} disabled={saving || players.length === 0}>
          + Goal
        </button>
        <button type="button" onClick={() => addEvent("YELLOW")} disabled={saving || players.length === 0}>
          + Yellow
        </button>
        <button type="button" onClick={() => addEvent("RED")} disabled={saving || players.length === 0}>
          + Red
        </button>
        <button type="button" onClick={() => addEvent("SUB")} disabled={saving || players.length === 0}>
          + Sub
        </button>
      </div>

      {players.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.8 }}>
          No players found — add players first so you can record match events.
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div style={{ marginTop: 12, opacity: 0.8 }}>
          No events recorded yet (subs, goals, assists, cards). Use the buttons above to add some.
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {sorted.map((e, idx) => {
            const minuteLabel = `${e.minute}'`;
            const isGoal = e.type === "GOAL";
            const isCard = e.type === "YELLOW" || e.type === "RED";
            const isSub = e.type === "SUB";

            let preview = "";
            if (isGoal) {
              const scorer = playerLabel(playerById, e.playerId ?? null);
              const assister = e.relatedPlayerId ? playerLabel(playerById, e.relatedPlayerId) : null;
              preview = assister ? `⚽ Goal — ${scorer} (assist: ${assister})` : `⚽ Goal — ${scorer}`;
            } else if (e.type === "YELLOW") {
              preview = `🟨 Yellow — ${playerLabel(playerById, e.playerId ?? null)}`;
            } else if (e.type === "RED") {
              preview = `🟥 Red — ${playerLabel(playerById, e.playerId ?? null)}`;
            } else if (isSub) {
              const on = playerLabel(playerById, e.playerId ?? null);
              const off = playerLabel(playerById, e.relatedPlayerId ?? null);
              preview = `🔁 Sub — ON: ${on} / OFF: ${off}`;
            }

            return (
              <div
                key={`${e._key}-${e.id ?? idx}`}
                style={{
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 12,
                  padding: 10,
                  background: "rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 800, width: 70 }}>{minuteLabel}</div>
                    <div style={{ fontWeight: 800 }}>{preview}</div>
                  </div>

                  <button type="button" onClick={() => removeEvent(e._key)} disabled={saving}>
                    Remove
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "90px 140px 1fr 1fr 1fr",
                    gap: 10,
                    alignItems: "end",
                  }}
                >
                  <label>
                    Minute
                    <input
                      type="number"
                      min={0}
                      max={130}
                      step={1}
                      value={e.minute}
                      onChange={(ev) => updateEvent(e._key, { minute: Number(ev.target.value) })}
                      disabled={saving}
                      style={{ width: "100%" }}
                    />
                  </label>

                  <label>
                    Type
                    <select
                      value={e.type}
                      onChange={(ev) => {
                        const nextType = ev.target.value as MatchEventType;

                        if (nextType === "GOAL") {
                          updateEvent(e._key, { type: nextType, relatedPlayerId: null });
                        } else if (nextType === "YELLOW" || nextType === "RED") {
                          updateEvent(e._key, { type: nextType, relatedPlayerId: null });
                        } else {
                          const pid = firstPlayerIdOrNull();
                          const off = players.length >= 2 ? players[1].id : pid;
                          updateEvent(e._key, { type: nextType, playerId: pid, relatedPlayerId: off });
                        }
                      }}
                      disabled={saving}
                      style={{ width: "100%" }}
                    >
                      <option value="GOAL">GOAL</option>
                      <option value="YELLOW">YELLOW</option>
                      <option value="RED">RED</option>
                      <option value="SUB">SUB</option>
                    </select>
                  </label>

                  <label>
                    {isSub ? "Sub ON" : isGoal ? "Scorer" : "Player"}
                    <select
                      value={e.playerId ?? ""}
                      onChange={(ev) =>
                        updateEvent(e._key, { playerId: ev.target.value ? Number(ev.target.value) : null })
                      }
                      disabled={saving}
                      style={{ width: "100%" }}
                    >
                      <option value="">—</option>
                      {players
                        .slice()
                        .sort((a, b) => a.number - b.number)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.number} {p.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    {isGoal ? "Assist (optional)" : isSub ? "Sub OFF" : "—"}
                    <select
                      value={e.relatedPlayerId ?? ""}
                      onChange={(ev) =>
                        updateEvent(e._key, { relatedPlayerId: ev.target.value ? Number(ev.target.value) : null })
                      }
                      disabled={saving || isCard}
                      style={{ width: "100%" }}
                    >
                      <option value="">—</option>
                      {players
                        .slice()
                        .sort((a, b) => a.number - b.number)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.number} {p.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    Note (optional)
                    <input
                      value={e.note ?? ""}
                      onChange={(ev) => updateEvent(e._key, { note: ev.target.value })}
                      disabled={saving}
                      placeholder="e.g. left foot, from corner, injury…"
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>

                {(() => {
                  const msg = validateEvent(e);
                  if (!msg) return null;
                  return <div style={{ marginTop: 8, color: "crimson", fontWeight: 700, fontSize: 13 }}>{msg}</div>;
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}