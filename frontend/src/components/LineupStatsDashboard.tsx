import { useMemo } from "react";
import type { Player } from "../models/Players";
import type { Formation } from "../models/Formation";
import type { LineupSlot } from "../models/Lineup";

type Props = {
  formation: Formation;
  slots: LineupSlot[];
  players: Player[];
};

function n0(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function LineupStatsDashboard({ formation, slots, players }: Props) {
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const stats = useMemo(() => {
    const assigned = slots.filter((s) => s.playerId != null);

    const totals = assigned.reduce(
      (acc, s) => {
        acc.goals += Math.max(0, Math.floor(n0((s as any).goals)));
        acc.assists += Math.max(0, Math.floor(n0((s as any).assists)));
        acc.yellow += Math.max(0, Math.floor(n0((s as any).yellowCards)));
        acc.red += Math.max(0, Math.floor(n0((s as any).redCards)));
        const r = typeof s.rating === "number" ? s.rating : null;
        if (r != null) {
          acc.ratingSum += r;
          acc.ratingCount += 1;
        }
        return acc;
      },
      { goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, ratingCount: 0 }
    );

    const avgRating =
      totals.ratingCount > 0 ? Math.round((totals.ratingSum / totals.ratingCount) * 10) / 10 : null;

    // leaders
    const byMetric = (key: "goals" | "assists" | "yellowCards" | "redCards") => {
      let best: { playerId: number; value: number } | null = null;

      for (const s of assigned) {
        const pid = s.playerId!;
        const value = Math.max(0, Math.floor(n0((s as any)[key])));
        if (value <= 0) continue;

        if (!best || value > best.value) best = { playerId: pid, value };
      }
      return best;
    };

    const topGoals = byMetric("goals");
    const topAssists = byMetric("assists");
    const topYellow = byMetric("yellowCards");
    const topRed = byMetric("redCards");

    return { assignedCount: assigned.length, totals, avgRating, topGoals, topAssists, topYellow, topRed };
  }, [slots]);

  function nameFor(playerId: number) {
    const p = playerById.get(playerId);
    return p ? `#${p.number} ${p.name}` : `Player #${playerId}`;
  }

  function Leader({
    title,
    icon,
    entry,
  }: {
    title: string;
    icon: string;
    entry: { playerId: number; value: number } | null;
  }) {
    return (
      <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 10 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
        {entry ? (
          <div style={{ fontSize: 13 }}>
            <span style={{ marginRight: 6 }}>{icon}</span>
            <strong>{entry.value}</strong> — {nameFor(entry.playerId)}
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.7 }}>None recorded</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Lineup stats</div>

      <div
        className="card"
        style={{
          padding: 12,
          display: "grid",
          gap: 12,
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.12)",
        }}
      >
        {/* Totals */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <div>
            <strong>Players assigned:</strong> {stats.assignedCount}/{(formation.slots ?? []).length}
          </div>

          <div title="Goals">
            <strong>⚽</strong> {stats.totals.goals}
          </div>
          <div title="Assists">
            <strong>🅰️</strong> {stats.totals.assists}
          </div>
          <div title="Yellow cards">
            <strong>🟨</strong> {stats.totals.yellow}
          </div>
          <div title="Red cards">
            <strong>🟥</strong> {stats.totals.red}
          </div>

          <div>
            <strong>Avg rating:</strong> {stats.avgRating == null ? "—" : stats.avgRating}
          </div>
        </div>

        {/* Leaders */}
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <Leader title="Top scorer" icon="⚽" entry={stats.topGoals} />
          <Leader title="Top assister" icon="🅰️" entry={stats.topAssists} />
          <Leader title="Most yellows" icon="🟨" entry={stats.topYellow} />
          <Leader title="Most reds" icon="🟥" entry={stats.topRed} />
        </div>
      </div>
    </div>
  );
}

