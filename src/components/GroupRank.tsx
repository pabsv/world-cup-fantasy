"use client";

import type { Team } from "@/lib/types";
import { Flag } from "./Flag";

/** Tap a team to assign the next position (1→2→3→4). Tap a ranked team to deselect
    it; the ones below shift up. Rows stay put; only the rank badge changes. */
export function GroupRank({
  groupId,
  teams,
  ranking,
  onChange,
  locked,
}: {
  groupId: string;
  teams: Team[]; // seed order, stable
  ranking: string[]; // team ids in assigned order, length 0..4
  onChange: (r: string[]) => void;
  locked: boolean;
}) {
  const rankOf = (id: string) => {
    const i = ranking.indexOf(id);
    return i < 0 ? null : i + 1;
  };

  function toggle(id: string) {
    if (locked) return;
    const i = ranking.indexOf(id);
    if (i < 0) {
      if (ranking.length < 4) onChange([...ranking, id]);
    } else {
      onChange(ranking.filter((x) => x !== id));
    }
  }

  const complete = ranking.length === 4;

  return (
    <div className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-gold/15 px-4 py-2.5">
        <h3 className="display text-base font-bold text-forest">
          <span className="text-charcoal/50">Group</span> {groupId}
        </h3>
        <span className={`text-xs tabular ${complete ? "text-gold-dark" : "text-charcoal/40"}`}>
          {complete ? "✓ ranked" : `${ranking.length}/4`}
        </span>
      </header>
      <ul>
        {teams.map((t) => {
          const r = rankOf(t.id);
          return (
            <li key={t.id} className="border-t border-gold/10 first:border-t-0">
              <button
                onClick={() => toggle(t.id)}
                disabled={locked}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  r ? "bg-gold/10" : ""
                } ${locked ? "" : "hover:bg-gold/[0.06]"}`}
              >
                <Flag code={t.flag_code} size={26} />
                <span className="flex-1 truncate text-sm font-medium text-charcoal">{t.name}</span>
                <RankBadge r={r} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RankBadge({ r }: { r: number | null }) {
  if (!r)
    return <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-gold/40" />;
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold tabular ${
        r === 1
          ? "bg-gold text-forest-deep"
          : r === 2
            ? "bg-gold/70 text-forest-deep"
            : "bg-forest/12 text-forest"
      }`}
    >
      {r}
    </span>
  );
}
