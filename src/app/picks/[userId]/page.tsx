import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LEAGUE_ID,
  type Team,
  type Group,
  type Competition,
  type GroupPrediction,
  type GroupResult,
} from "@/lib/types";
import { Flag } from "@/components/Flag";
import { Avatar } from "@/components/Avatar";
import { positionPoints, scoreGroup, perfectBonus } from "@/lib/format";

export default async function PicksPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: groups }, { data: teams }, { data: comps }, { data: preds }, { data: results }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", userId).single(),
      supabase.from("groups").select("*").order("id"),
      supabase.from("teams").select("*").order("group_id").order("seed"),
      supabase.from("competitions").select("*").eq("type", "group_standings").limit(1),
      supabase
        .from("group_predictions")
        .select("*")
        .eq("league_id", LEAGUE_ID)
        .eq("user_id", userId),
      supabase.from("group_results").select("*"),
    ]);

  if (!profile) notFound();

  const comp = (comps?.[0] ?? null) as Competition | null;
  const cfg = comp?.scoring_config ?? {};
  const predByGroup = new Map<string, string[]>();
  for (const p of (preds ?? []) as GroupPrediction[]) predByGroup.set(p.group_id, p.predicted_order);
  const resByGroup = new Map<string, string[]>();
  for (const r of (results ?? []) as GroupResult[]) resByGroup.set(r.group_id, r.final_order);

  const teamMap = new Map<string, Team>();
  for (const t of (teams ?? []) as Team[]) teamMap.set(t.id, t);

  const hidden = (preds ?? []).length === 0; // RLS hides others' picks pre-lock
  const total = [...predByGroup.entries()].reduce((sum, [gid, order]) => {
    const res = resByGroup.get(gid);
    return res ? sum + scoreGroup(cfg, order, res) : sum;
  }, 0);
  const isMe = user?.id === userId;

  return (
    <div className="space-y-5">
      <Link href="/leaderboard" className="eyebrow text-gold-dark hover:text-forest">
        ← Leaderboard
      </Link>
      <header className="flex items-center gap-3">
        <Avatar name={profile.display_name} id={userId} size={44} />
        <div>
          <h1 className="display text-xl text-forest">
            {profile.display_name ?? "Player"}
            {isMe && <span className="ml-2 chip">you</span>}
          </h1>
          <p className="eyebrow text-gold-dark">Group stage picks</p>
        </div>
        {resByGroup.size > 0 && (
          <span className="ml-auto tabular font-mono text-2xl font-bold text-gold-dark">
            {total}
            <span className="ml-1 text-sm font-normal text-charcoal/70">pts</span>
          </span>
        )}
      </header>

      {hidden ? (
        <div className="card p-8 text-center text-sm text-charcoal/70">
          🔒 These picks are hidden until predictions lock at kickoff.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {((groups ?? []) as Group[]).map((g) => {
            const order = predByGroup.get(g.id);
            const res = resByGroup.get(g.id);
            if (!order) return null;
            const gpoints = res ? scoreGroup(cfg, order, res) : null;
            const perfect = res && order.every((t, i) => t === res[i]);
            return (
              <div key={g.id} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-gold/20 px-4 py-2.5">
                  <h3 className="display text-sm text-forest">
                    <span className="eyebrow text-gold-dark">Group</span> {g.id}
                  </h3>
                  {gpoints !== null && (
                    <span className="chip">
                      {perfect && "✨ "}
                      {gpoints} pts
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-gold/15">
                  {order.map((teamId, i) => {
                    const t = teamMap.get(teamId);
                    if (!t) return null;
                    const correct = res ? res[i] === teamId : null;
                    return (
                      <li
                        key={teamId}
                        className={`flex items-center gap-3 px-3 py-2.5${
                          correct === true ? " bg-gold/10" : ""
                        }`}
                      >
                        <span className="w-5 text-center font-mono text-xs font-bold text-charcoal/40">
                          {i + 1}
                        </span>
                        <Flag code={t.flag_code} size={24} />
                        <span
                          className={`flex-1 truncate text-sm${
                            correct === false ? " text-charcoal/40" : " text-charcoal"
                          }`}
                        >
                          {t.name}
                        </span>
                        {correct === true && (
                          <span className="font-mono text-sm font-bold text-gold-dark">
                            +{positionPoints(cfg, i + 1)}
                          </span>
                        )}
                        {correct === false && <span className="text-sm text-charcoal/40">✕</span>}
                      </li>
                    );
                  })}
                </ul>
                {perfect && (
                  <p className="border-t border-gold/40 bg-gold/15 px-3 py-1.5 text-center text-xs font-semibold text-gold-dark">
                    ✨ Perfect group · +{perfectBonus(cfg)} bonus
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
