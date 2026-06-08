import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Countdown } from "@/components/Countdown";
import { type Competition } from "@/lib/types";

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

  return <Landing kickoff={kickoff} loggedIn={!!user} />;
}

// ── Public landing — same for everyone, only the CTA target changes ───────────
function Landing({ kickoff, loggedIn }: { kickoff: string; loggedIn: boolean }) {
  const cta = loggedIn ? "/predict" : "/login";
  const steps = [
    ["🤝", "Join the league", "One league, all your friends. Separate leagues come later."],
    ["🏆", "Make your Full World Cup Prediction", "One prediction of the entire tournament before kickoff — groups, the best thirds, the full bracket, the champion."],
    ["🗓️", "Play every stage", "New competitions open as it unfolds: 3rd-Place Playoff and the Knockouts — recalibrate with real results each round."],
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
        <Link href={cta} className="btn btn-gold">
          {loggedIn ? "Make your prediction" : "Get started — it's free"}
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
        <Link href={cta} className="btn btn-primary">
          {loggedIn ? "Go to your predictions" : "Create your account"}
        </Link>
      </section>
    </div>
  );
}
