"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Team, Group } from "@/lib/types";
import { Flag } from "./Flag";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function AdminResults({
  groups,
  teams,
  initial,
}: {
  groups: Group[];
  teams: Team[];
  initial: Record<string, string[]>;
}) {
  const supabase = createClient();
  const router = useRouter();

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamsByGroup = useMemo(() => {
    const m = new Map<string, Team[]>();
    for (const t of teams) {
      if (!m.has(t.group_id)) m.set(t.group_id, []);
      m.get(t.group_id)!.push(t);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.seed - b.seed);
    return m;
  }, [teams]);

  const [orders, setOrders] = useState<Record<string, string[]>>(() => {
    const o: Record<string, string[]> = {};
    for (const g of groups) o[g.id] = initial[g.id] ?? (teamsByGroup.get(g.id) ?? []).map((t) => t.id);
    return o;
  });
  const [states, setStates] = useState<Record<string, SaveState>>(() => {
    const s: Record<string, SaveState> = {};
    for (const g of groups) s[g.id] = initial[g.id] ? "saved" : "idle";
    return s;
  });

  function move(groupId: string, i: number, dir: -1 | 1) {
    setOrders((prev) => {
      const order = [...prev[groupId]];
      const j = i + dir;
      if (j < 0 || j >= order.length) return prev;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...prev, [groupId]: order };
    });
    setStates((s) => ({ ...s, [groupId]: "dirty" }));
  }

  async function save(groupId: string) {
    setStates((s) => ({ ...s, [groupId]: "saving" }));
    const { error } = await supabase
      .from("group_results")
      .upsert(
        { group_id: groupId, final_order: orders[groupId], entered_at: new Date().toISOString() },
        { onConflict: "group_id" },
      );
    setStates((s) => ({ ...s, [groupId]: error ? "error" : "saved" }));
    if (!error) router.refresh();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => {
        const st = states[g.id];
        return (
          <div key={g.id} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-bold">
                <span className="text-muted">Group</span> {g.id}
              </h3>
              <button
                className="btn btn-primary px-3 py-1 text-xs"
                disabled={st === "saving" || st === "saved"}
                onClick={() => save(g.id)}
              >
                {st === "saving" ? "Saving…" : st === "saved" ? "Saved ✓" : "Save result"}
              </button>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {orders[g.id].map((teamId, i) => {
                const t = teamMap.get(teamId);
                if (!t) return null;
                return (
                  <li key={teamId} className="flex items-center gap-3 px-3 py-2.5">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-md text-xs font-bold ${
                        i === 0 ? "bg-accent text-[var(--accent-ink)]" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <Flag code={t.flag_code} size={24} />
                    <span className="flex-1 truncate text-sm">{t.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => move(g.id, i, -1)}
                        disabled={i === 0}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-surface-2 text-muted enabled:hover:text-foreground disabled:opacity-25"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(g.id, i, 1)}
                        disabled={i === 3}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-surface-2 text-muted enabled:hover:text-foreground disabled:opacity-25"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {st === "error" && (
              <p className="border-t border-border px-3 py-1.5 text-center text-xs text-[var(--danger)]">
                Save failed — are you admin?
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
