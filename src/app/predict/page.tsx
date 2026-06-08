import { createClient } from "@/lib/supabase/server";
import { PredictBoard } from "@/components/PredictBoard";
import { LEAGUE_ID, type Team, type Group, type Competition, type GroupPrediction } from "@/lib/types";

export default async function PredictPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: groups }, { data: teams }, { data: comps }, { data: preds }] = await Promise.all([
    supabase.from("groups").select("*").order("id"),
    supabase.from("teams").select("*").order("group_id").order("seed"),
    supabase.from("competitions").select("*").eq("type", "group_standings").limit(1),
    supabase
      .from("group_predictions")
      .select("*")
      .eq("league_id", LEAGUE_ID)
      .eq("user_id", user!.id),
  ]);

  const comp = (comps?.[0] ?? null) as Competition | null;
  const kickoff = comp?.locks_at ?? "2026-06-11T19:00:00-06:00";
  const locked = new Date(kickoff).getTime() <= Date.now();

  const initial: Record<string, string[]> = {};
  for (const p of (preds ?? []) as GroupPrediction[]) initial[p.group_id] = p.predicted_order;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Group Stage</h1>
        <p className="mt-1 text-sm text-muted">
          Rank all 4 teams in each group, 1st to 4th. Order auto-saves.
        </p>
      </header>

      <PredictBoard
        userId={user!.id}
        leagueId={LEAGUE_ID}
        locked={locked}
        groups={(groups ?? []) as Group[]}
        teams={(teams ?? []) as Team[]}
        initial={initial}
      />
    </div>
  );
}
