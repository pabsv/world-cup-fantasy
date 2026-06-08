"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, Group } from "@/lib/types";
import { Flag } from "./Flag";

type SaveState = "idle" | "saving" | "saved" | "error";

export function PredictBoard({
  userId,
  leagueId,
  locked,
  groups,
  teams,
  initial,
}: {
  userId: string;
  leagueId: string;
  locked: boolean;
  groups: Group[];
  teams: Team[];
  initial: Record<string, string[]>;
}) {
  const supabase = createClient();

  const teamMap = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  const teamsByGroup = useMemo(() => {
    const m = new Map<string, Team[]>();
    for (const t of teams) {
      if (!m.has(t.group_id)) m.set(t.group_id, []);
      m.get(t.group_id)!.push(t);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.seed - b.seed);
    return m;
  }, [teams]);

  // default order = seed order
  const [orders, setOrders] = useState<Record<string, string[]>>(() => {
    const o: Record<string, string[]> = {};
    for (const g of groups) {
      o[g.id] = initial[g.id] ?? (teamsByGroup.get(g.id) ?? []).map((t) => t.id);
    }
    return o;
  });

  const [saved, setSaved] = useState<Set<string>>(() => new Set(Object.keys(initial)));
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const doneCount = saved.size;

  async function persist(groupId: string, order: string[]) {
    setStates((s) => ({ ...s, [groupId]: "saving" }));
    const { error } = await supabase.from("group_predictions").upsert(
      {
        league_id: leagueId,
        user_id: userId,
        group_id: groupId,
        predicted_order: order,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "league_id,user_id,group_id" },
    );
    if (error) {
      setStates((s) => ({ ...s, [groupId]: "error" }));
    } else {
      setSaved((prev) => new Set(prev).add(groupId));
      setStates((s) => ({ ...s, [groupId]: "saved" }));
    }
  }

  function move(groupId: string, index: number, dir: -1 | 1) {
    if (locked) return;
    setOrders((prev) => {
      const order = [...prev[groupId]];
      const j = index + dir;
      if (j < 0 || j >= order.length) return prev;
      [order[index], order[j]] = [order[j], order[index]];
      const next = { ...prev, [groupId]: order };
      // debounce save for this group
      clearTimeout(timers.current[groupId]);
      timers.current[groupId] = setTimeout(() => persist(groupId, order), 500);
      setStates((s) => ({ ...s, [groupId]: "saving" }));
      return next;
    });
  }

  async function saveAll() {
    for (const g of groups) {
      if (!saved.has(g.id) || states[g.id] === "error") {
        await persist(g.id, orders[g.id]);
      }
    }
  }

  return (
    <>
      {locked && (
        <div className="card flex items-center gap-2 border-[var(--border-strong)] bg-[rgba(244,114,182,0.06)] p-3 text-sm">
          🔒 Predictions are locked. This is your final submission.
        </div>
      )}

      {/* sticky progress / save-all */}
      {!locked && (
        <div className="sticky top-14 z-30 -mx-4 mb-1 border-b border-border bg-background/85 px-4 py-2 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(doneCount / groups.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-muted tabular">
                {doneCount}/{groups.length} saved
              </span>
            </div>
            <button className="btn btn-ghost text-sm" onClick={saveAll}>
              Save all
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            order={orders[g.id]}
            teamMap={teamMap}
            locked={locked}
            state={saved.has(g.id) ? (states[g.id] ?? "saved") : (states[g.id] ?? "idle")}
            onMove={(idx, dir) => move(g.id, idx, dir)}
          />
        ))}
      </div>
    </>
  );
}

function StatusDot({ state }: { state: SaveState }) {
  const map: Record<SaveState, { c: string; t: string }> = {
    idle: { c: "bg-muted-2", t: "Not saved" },
    saving: { c: "bg-gold animate-pulse", t: "Saving…" },
    saved: { c: "bg-accent", t: "Saved" },
    error: { c: "bg-[var(--danger)]", t: "Error — retry" },
  };
  const { c, t } = map[state];
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${c}`} />
      {t}
    </span>
  );
}

function GroupCard({
  group,
  order,
  teamMap,
  locked,
  state,
  onMove,
}: {
  group: Group;
  order: string[];
  teamMap: Map<string, Team>;
  locked: boolean;
  state: SaveState;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-bold tracking-wide">
          <span className="text-muted">Group</span> {group.id}
        </h3>
        {!locked && <StatusDot state={state} />}
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {order.map((teamId, i) => {
          const t = teamMap.get(teamId);
          if (!t) return null;
          return (
            <li key={teamId} className="flex items-center gap-3 px-3 py-2.5">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold ${
                  i === 0
                    ? "bg-accent text-[var(--accent-ink)]"
                    : i === 1
                      ? "bg-white/15 text-foreground"
                      : "bg-surface-2 text-muted"
                }`}
              >
                {i + 1}
              </span>
              <Flag code={t.flag_code} size={26} />
              <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
              {!locked && (
                <div className="flex shrink-0 items-center gap-1">
                  <ArrowBtn dir="up" disabled={i === 0} onClick={() => onMove(i, -1)} />
                  <ArrowBtn dir="down" disabled={i === order.length - 1} onClick={() => onMove(i, 1)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ArrowBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "up" ? "Move up" : "Move down"}
      className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-surface-2 text-muted transition-colors enabled:hover:border-[var(--border-strong)] enabled:hover:text-foreground disabled:opacity-25"
    >
      {dir === "up" ? "↑" : "↓"}
    </button>
  );
}
