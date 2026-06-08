import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Countdown } from "@/components/Countdown";
import { LEAGUE_ID, type Competition } from "@/lib/types";

const KICKOFF_FALLBACK = "2026-06-11T19:00:00-06:00";

export default async function PredictPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comps } = await supabase.from("competitions").select("*").order("sort_order");
  const competitions = (comps ?? []) as Competition[];
  const groupComp = competitions.find((c) => c.type === "group_standings");
  const kickoff = groupComp?.locks_at ?? KICKOFF_FALLBACK;
  const locked = new Date(kickoff).getTime() <= Date.now();

  const { count: predicted } = await supabase
    .from("group_predictions")
    .select("group_id", { count: "exact", head: true })
    .eq("league_id", LEAGUE_ID)
    .eq("user_id", user!.id);
  const done = predicted ?? 0;
  const status = locked ? "locked" : done === 0 ? "start" : "in progress";

  return (
    <div className="space-y-6">
      <Hero kickoff={kickoff} locked={locked} />

      <section>
        <p className="eyebrow mb-2 px-1">Your prediction</p>
        <Link
          href="/predict/full"
          className="card flex items-center justify-between p-4 transition-colors hover:border-gold/40"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-paper text-lg">🏆</span>
            <div>
              <p className="display font-semibold text-forest">Full World Cup Prediction</p>
              <p className="text-xs text-charcoal/60">
                Groups, best thirds, every knockout — your champion.
              </p>
            </div>
          </div>
          <span className="chip">{status}</span>
        </Link>
      </section>

      <section>
        <p className="eyebrow mb-2 px-1">Upcoming competitions</p>
        <div className="space-y-2">
          <UpcomingRow icon="🥉" title="3rd-Place Playoff" sub="Opens after the group stage" />
          <UpcomingRow icon="🎯" title="Knockout Bracket" sub="Opens once the Round of 32 is set" />
          <UpcomingRow icon="🎲" title="QF Bracket" sub="Opens once the quarter-finals are set" />
        </div>
      </section>
    </div>
  );
}

function Hero({ kickoff, locked }: { kickoff: string; locked: boolean }) {
  return (
    <section className="card-forest overflow-hidden p-7 text-center">
      <span className="chip mb-4 border-gold/40 !text-gold">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        {locked ? "Predictions locked" : "Predictions open"}
      </span>
      <p className="label-caps text-xs text-cream/60">
        {locked ? "Tournament underway" : "Kicks off in"}
      </p>
      <div className="my-5 flex justify-center">
        <Countdown iso={kickoff} />
      </div>
      <p className="text-sm text-cream/60">
        {new Date(kickoff).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "America/Mexico_City",
        })}{" "}
        · Estadio Azteca, Mexico City
      </p>
    </section>
  );
}

function UpcomingRow({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="card flex items-center justify-between p-4 opacity-60">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-paper text-lg">{icon}</span>
        <div>
          <p className="display font-semibold text-forest">{title}</p>
          <p className="text-xs text-charcoal/60">{sub}</p>
        </div>
      </div>
      <span className="chip">soon</span>
    </div>
  );
}
