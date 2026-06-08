import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FullRunBuilder } from "@/components/FullRunBuilder";
import {
  LEAGUE_ID,
  type Team,
  type Group,
  type Competition,
  type GroupPrediction,
} from "@/lib/types";

export default async function PredictFullPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: groups }, { data: teams }, { data: comps }, { data: preds }] = await Promise.all([
    supabase.from("groups").select("*").order("id"),
    supabase.from("teams").select("*").order("group_id").order("seed"),
    supabase.from("competitions").select("*"),
    supabase
      .from("group_predictions")
      .select("*")
      .eq("league_id", LEAGUE_ID)
      .eq("user_id", user!.id),
  ]);

  const competitions = (comps ?? []) as Competition[];
  const og = competitions.find((c) => c.type === "og_full")!;
  const groupComp = competitions.find((c) => c.type === "group_standings");
  const kickoff = groupComp?.locks_at ?? og.locks_at;
  const locked = new Date(kickoff).getTime() <= Date.now();

  const initialOrders: Record<string, string[]> = {};
  for (const p of (preds ?? []) as GroupPrediction[]) initialOrders[p.group_id] = p.predicted_order;

  // existing full-prediction bracket payload
  const { data: bp } = await supabase
    .from("bracket_predictions")
    .select("payload")
    .eq("competition_id", og.id)
    .eq("user_id", user!.id)
    .maybeSingle();
  const payload = (bp?.payload ?? {}) as { thirds?: string[]; winners?: Record<number, string> };

  return (
    <div className="space-y-5">
      <header>
        <Link href="/predict" className="text-sm text-charcoal/60 transition-colors hover:text-forest">
          ← Back
        </Link>
        <p className="eyebrow mt-2">Full World Cup Prediction</p>
        <h1 className="display text-3xl text-forest">Predict the whole World Cup</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          One prediction, the entire tournament — groups, the best thirds, and every knockout tie to
          the champion.
        </p>
      </header>

      <FullRunBuilder
        userId={user!.id}
        leagueId={LEAGUE_ID}
        ogCompId={og.id}
        locked={locked}
        groups={(groups ?? []) as Group[]}
        teams={(teams ?? []) as Team[]}
        initialOrders={initialOrders}
        initialThirds={payload.thirds ?? []}
        initialWinners={payload.winners ?? {}}
      />
    </div>
  );
}
