import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Countdown } from "@/components/Countdown";
import { LEAGUE_ID, type Competition } from "@/lib/types";

const KICKOFF_FALLBACK = "2026-06-11T19:00:00-06:00";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comps } = await supabase.from("competitions").select("*").order("sort_order");
  const competitions = (comps ?? []) as Competition[];
  const groupComp = competitions.find((c) => c.type === "group_standings");
  const kickoff = groupComp?.locks_at ?? KICKOFF_FALLBACK;
  const locked = new Date(kickoff).getTime() <= Date.now();

  if (!user) return <Landing kickoff={kickoff} />;

  const { count: predicted } = await supabase
    .from("group_predictions")
    .select("group_id", { count: "exact", head: true })
    .eq("league_id", LEAGUE_ID)
    .eq("user_id", user.id);
  const done = predicted ?? 0;

  return (
    <div className="space-y-6">
      <Hero kickoff={kickoff} locked={locked} />

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Your run</p>
            <h2 className="display text-xl text-forest">OG Full Run</h2>
            <p className="text-sm text-charcoal/70">
              {done}/12 groups ranked{done === 12 ? " · bracket next" : ""}
            </p>
          </div>
          <Link href="/predict" className="btn btn-primary">
            {locked ? "View" : done === 0 ? "Start" : "Continue"}
          </Link>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-forest transition-all"
            style={{ width: `${(done / 12) * 100}%` }}
          />
        </div>
      </section>

      <section>
        <p className="eyebrow mb-2 px-1">Competitions</p>
        <div className="space-y-2">
          {competitions.map((c) => (
            <CompRow key={c.id} c={c} locked={locked} done={done} />
          ))}
          <UpcomingRow icon="🥉" title="3rd-Place Playoff" sub="Opens after the group stage" />
          <UpcomingRow icon="🎯" title="Knockout Bracket" sub="Opens once the Round of 32 is set" />
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

function CompRow({ c, locked, done }: { c: Competition; locked: boolean; done: number }) {
  const isGroup = c.type === "group_standings";
  return (
    <Link
      href="/predict"
      className="card flex items-center justify-between p-4 transition-colors hover:border-gold/40"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-paper text-lg">
          {isGroup ? "🗳️" : "🏆"}
        </span>
        <div>
          <p className="display font-semibold text-forest">{c.title}</p>
          <p className="text-xs text-charcoal/60">{c.subtitle}</p>
        </div>
      </div>
      <span className="chip">{isGroup ? (locked ? "locked" : `${done}/12`) : "open"}</span>
    </Link>
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

// ── Public landing ───────────────────────────────────────────────────────────
function Landing({ kickoff }: { kickoff: string }) {
  const steps = [
    ["🤝", "Join the league", "One league, all your friends. Separate leagues come later."],
    ["🏆", "Make your OG Full Run", "One prediction of the entire tournament before kickoff — groups, the best thirds, the full bracket, the champion."],
    ["🗓️", "Play every stage", "New competitions open as it unfolds: Group Stage, 3rd-Place Playoff, and the Knockouts — recalibrate with real results each round."],
    ["📈", "Climb the table", "Points for every call you get right. One overall league standing to settle it."],
  ];
  return (
    <div className="space-y-8">
      <section className="card-forest overflow-hidden p-8 text-center">
        <p className="eyebrow !text-gold">2026 World Cup</p>
        <h1 className="display mt-2 text-4xl leading-tight text-cream sm:text-5xl">
          Predict the World Cup with your friends
        </h1>
        <p className="mx-auto mt-3 max-w-md text-cream/70">
          Standings and winners only — no scores, no money. Just bragging rights.
        </p>
        <div className="my-6 flex justify-center">
          <Countdown iso={kickoff} />
        </div>
        <Link href="/login" className="btn btn-gold">
          Get started — it&apos;s free
        </Link>
      </section>

      <section>
        <p className="eyebrow mb-3 px-1 text-center">How it works</p>
        <div className="space-y-3">
          {steps.map(([icon, title, desc], i) => (
            <div key={i} className="card flex items-start gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-xl">
                {icon}
              </span>
              <div>
                <h3 className="display text-lg text-forest">{title}</h3>
                <p className="mt-0.5 text-sm text-charcoal/70">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-center gap-3 p-7 text-center">
        <h2 className="display text-2xl text-forest">Ready to play?</h2>
        <p className="max-w-sm text-sm text-charcoal/70">
          Lock in your predictions before the first whistle on June 11.
        </p>
        <Link href="/login" className="btn btn-primary">
          Create your account
        </Link>
      </section>
    </div>
  );
}
