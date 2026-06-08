import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Countdown } from "@/components/Countdown";
import { LEAGUE_ID, type Competition } from "@/lib/types";
import { maxGroupPoints } from "@/lib/format";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comps } = await supabase
    .from("competitions")
    .select("*")
    .order("sort_order");
  const competitions = (comps ?? []) as Competition[];
  const groupComp = competitions.find((c) => c.type === "group_standings");

  const { count: predicted } = await supabase
    .from("group_predictions")
    .select("group_id", { count: "exact", head: true })
    .eq("league_id", LEAGUE_ID)
    .eq("user_id", user!.id);

  const done = predicted ?? 0;
  const kickoff = groupComp?.locks_at ?? "2026-06-11T19:00:00-06:00";
  const locked = new Date(kickoff).getTime() <= Date.now();
  const maxPts = groupComp ? maxGroupPoints(groupComp.scoring_config) : 16;

  return (
    <div className="space-y-6">
      {/* Hero / countdown */}
      <section className="card overflow-hidden p-6 text-center">
        <span className="chip mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {locked ? "Predictions locked" : "Predictions open"}
        </span>
        <p className="text-sm font-medium uppercase tracking-widest text-muted">
          {locked ? "Tournament underway" : "Group stage locks in"}
        </p>
        <div className="my-5 flex justify-center">
          <Countdown iso={kickoff} />
        </div>
        <p className="text-sm text-muted">
          Kickoff{" "}
          {new Date(kickoff).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "America/Mexico_City",
          })}{" "}
          · Mexico City
        </p>
      </section>

      {/* Your status */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Your group picks</h2>
            <p className="text-sm text-muted">
              {done}/12 groups ranked{done === 12 ? " — all set 🎉" : ""}
            </p>
          </div>
          <Link href="/predict" className="btn btn-primary">
            {locked ? "View picks" : done === 0 ? "Start" : done === 12 ? "Edit" : "Continue"}
          </Link>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${(done / 12) * 100}%` }}
          />
        </div>
      </section>

      {/* Competitions */}
      <section>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted">
          Competitions
        </h3>
        <div className="space-y-2">
          {competitions.map((c) => (
            <CompetitionRow key={c.id} c={c} locked={locked} done={done} />
          ))}
        </div>
      </section>

      {/* Scoring explainer */}
      <section>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted">
          How group scoring works
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ScoreCard place="1st" pts={groupComp?.scoring_config.group?.positions?.["1"] ?? 5} hint="group winner" />
          <ScoreCard place="2nd" pts={groupComp?.scoring_config.group?.positions?.["2"] ?? 3} />
          <ScoreCard place="3rd" pts={groupComp?.scoring_config.group?.positions?.["3"] ?? 2} />
          <ScoreCard place="4th" pts={groupComp?.scoring_config.group?.positions?.["4"] ?? 1} />
        </div>
        <p className="mt-2 px-1 text-xs text-muted">
          Nail all 4 in a group for a{" "}
          <span className="text-accent-strong">
            +{groupComp?.scoring_config.group?.perfect_bonus ?? 5} bonus
          </span>
          . Up to {maxPts} per group · {maxPts * 12} max overall.
        </p>
      </section>
    </div>
  );
}

function CompetitionRow({ c, locked, done }: { c: Competition; locked: boolean; done: number }) {
  const isGroup = c.type === "group_standings";
  const isOG = c.type === "og_full";
  const href = isGroup ? "/predict" : isOG ? "/predict/bracket" : "/";
  return (
    <Link
      href={href}
      className="card flex items-center justify-between p-4 transition-colors hover:border-[var(--border-strong)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-lg">
          {isGroup ? "🗳️" : isOG ? "🏆" : "🎯"}
        </span>
        <div>
          <p className="font-semibold leading-tight">{c.title}</p>
          <p className="text-xs text-muted">{c.subtitle}</p>
        </div>
      </div>
      <span className="chip">
        {isGroup ? (locked ? "locked" : `${done}/12`) : isOG ? "capture" : "soon"}
      </span>
    </Link>
  );
}

function ScoreCard({ place, pts, hint }: { place: string; pts: number; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center p-3 text-center">
      <span className="text-xs font-medium text-muted">{place}</span>
      <span className="my-0.5 text-2xl font-bold text-accent">{pts}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-2">{hint ?? "pts"}</span>
    </div>
  );
}
