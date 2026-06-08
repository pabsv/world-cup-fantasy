import Link from "next/link";

export default function BracketPage() {
  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Home
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">🏆 OG Full Run</h1>
        <p className="mt-1 text-sm text-muted">Predict the entire tournament before kickoff.</p>
      </header>

      <div className="card space-y-4 p-6">
        <p className="text-sm leading-relaxed text-muted">
          The OG Full Run captures your one-shot prediction of the whole World Cup:
        </p>
        <ol className="space-y-2 text-sm">
          {[
            ["1", "Group standings", "Reuses your Group Stage rankings — no double entry."],
            ["2", "Best 8 third-placed teams", "Pick which thirds sneak into the Round of 32."],
            ["3", "Knockout bracket", "Fill every winner from the Round of 32 to the champion."],
          ].map(([n, t, d]) => (
            <li key={n} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-bold text-muted">
                {n}
              </span>
              <span>
                <span className="font-semibold text-foreground">{t}</span>
                <span className="text-muted"> — {d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="rounded-xl border border-[var(--border-strong)] bg-[rgba(244,114,182,0.06)] p-3 text-sm">
          🚧 The bracket builder is the next update. Your group rankings already count toward
          the OG Full Run — start there.
        </div>
        <Link href="/predict" className="btn btn-primary w-full">
          Rank the groups →
        </Link>
      </div>
    </div>
  );
}
