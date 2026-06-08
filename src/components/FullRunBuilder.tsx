"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, Group } from "@/lib/types";
import {
  R32,
  KO,
  ROUND_LABEL,
  FINAL_MATCH,
  resolveBracket,
  type Resolved,
  type Round,
} from "@/lib/bracket";
import { GroupRank } from "./GroupRank";
import { Flag } from "./Flag";

type Step = "groups" | "thirds" | "bracket" | "review";
const STEPS: { key: Step; label: string }[] = [
  { key: "groups", label: "Groups" },
  { key: "thirds", label: "Thirds" },
  { key: "bracket", label: "Bracket" },
  { key: "review", label: "Review" },
];

export function FullRunBuilder({
  userId,
  leagueId,
  ogCompId,
  locked,
  groups,
  teams,
  initialOrders,
  initialThirds,
  initialWinners,
}: {
  userId: string;
  leagueId: string;
  ogCompId: string;
  locked: boolean;
  groups: Group[];
  teams: Team[];
  initialOrders: Record<string, string[]>;
  initialThirds: string[];
  initialWinners: Record<number, string>;
}) {
  const supabase = createClient();
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

  const [step, setStep] = useState<Step>("groups");
  const [orders, setOrders] = useState<Record<string, string[]>>(() => {
    const o: Record<string, string[]> = {};
    for (const g of groups) o[g.id] = initialOrders[g.id] ?? [];
    return o;
  });
  const [thirds, setThirds] = useState<string[]>(initialThirds);
  const [winners, setWinners] = useState<Record<number, string>>(initialWinners);
  const [bracketSaved, setBracketSaved] = useState(true);
  const bracketTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const completeGroups = groups.filter((g) => orders[g.id]?.length === 4);
  const allGroupsDone = completeGroups.length === groups.length;

  const groupOrder = orders; // letter -> [ids]
  const resolved = useMemo(
    () => resolveBracket(groupOrder, thirds, winners),
    [groupOrder, thirds, winners],
  );

  // ── persistence ──────────────────────────────────────────────────────────
  async function saveGroup(groupId: string, ranking: string[]) {
    if (ranking.length === 4) {
      await supabase.from("group_predictions").upsert(
        {
          league_id: leagueId,
          user_id: userId,
          group_id: groupId,
          predicted_order: ranking,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "league_id,user_id,group_id" },
      );
    } else {
      // incomplete -> remove any stored row so progress stays honest
      await supabase
        .from("group_predictions")
        .delete()
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .eq("group_id", groupId);
    }
  }

  function setGroup(groupId: string, ranking: string[]) {
    setOrders((p) => ({ ...p, [groupId]: ranking }));
    // if 3rd-place team changed, that group's third selection may be stale -> clear it
    if (ranking.length < 3 && thirds.includes(groupId)) {
      setThirds((t) => t.filter((g) => g !== groupId));
    }
    void saveGroup(groupId, ranking);
  }

  function saveBracket(nextThirds: string[], nextWinners: Record<number, string>) {
    setBracketSaved(false);
    clearTimeout(bracketTimer.current);
    bracketTimer.current = setTimeout(async () => {
      await supabase.from("bracket_predictions").upsert(
        {
          competition_id: ogCompId,
          user_id: userId,
          payload: { thirds: nextThirds, winners: nextWinners },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "competition_id,user_id" },
      );
      setBracketSaved(true);
    }, 600);
  }

  function toggleThird(g: string) {
    if (locked) return;
    const next = thirds.includes(g)
      ? thirds.filter((x) => x !== g)
      : thirds.length < 8
        ? [...thirds, g]
        : thirds;
    setThirds(next);
    saveBracket(next, winners);
  }

  function pickWinner(matchId: number, teamId: string) {
    if (locked) return;
    const next = { ...winners, [matchId]: teamId };
    // prune downstream picks that are no longer valid after this change
    const r = resolveBracket(groupOrder, thirds, next);
    for (const id of Object.keys(next).map(Number)) {
      if (!r[id]?.winner) delete next[id];
    }
    next[matchId] = teamId;
    setWinners(next);
    saveBracket(thirds, next);
  }

  const champion = resolved[FINAL_MATCH]?.winner ?? null;

  return (
    <div className="space-y-5">
      <Stepper step={step} setStep={setStep} allGroupsDone={allGroupsDone} thirdsCount={thirds.length} />

      {locked && (
        <div className="card-forest flex items-center gap-2 p-3 text-sm">
          🔒 Predictions are locked — this is your final OG Full Run.
        </div>
      )}

      {step === "groups" && (
        <section className="space-y-3">
          <StepHead
            n="1"
            title="Rank every group"
            desc="Tap teams 1st → 4th. Tap again to deselect. This also feeds the Group Stage competition."
            badge={`${completeGroups.length}/12`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <GroupRank
                key={g.id}
                groupId={g.id}
                teams={teamsByGroup.get(g.id) ?? []}
                ranking={orders[g.id] ?? []}
                onChange={(r) => setGroup(g.id, r)}
                locked={locked}
              />
            ))}
          </div>
          <NextBar
            disabled={!allGroupsDone}
            hint={allGroupsDone ? undefined : "Finish all 12 groups to continue"}
            onClick={() => setStep("thirds")}
            label="Next · pick the 8 thirds"
          />
        </section>
      )}

      {step === "thirds" && (
        <ThirdsStep
          groups={groups}
          orders={orders}
          teamMap={teamMap}
          thirds={thirds}
          toggle={toggleThird}
          locked={locked}
          onBack={() => setStep("groups")}
          onNext={() => setStep("bracket")}
          ready={allGroupsDone}
        />
      )}

      {step === "bracket" && (
        <BracketStep
          resolved={resolved}
          teamMap={teamMap}
          pickWinner={pickWinner}
          locked={locked}
          champion={champion}
          saved={bracketSaved}
          ready={thirds.length === 8}
          onBack={() => setStep("thirds")}
          onNext={() => setStep("review")}
        />
      )}

      {step === "review" && (
        <ReviewStep
          champion={champion}
          teamMap={teamMap}
          completeGroups={completeGroups.length}
          thirdsCount={thirds.length}
          resolved={resolved}
          saved={bracketSaved}
          onEdit={() => setStep("groups")}
        />
      )}
    </div>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────
function Stepper({
  step,
  setStep,
  allGroupsDone,
  thirdsCount,
}: {
  step: Step;
  setStep: (s: Step) => void;
  allGroupsDone: boolean;
  thirdsCount: number;
}) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((s, i) => {
        const reachable =
          i === 0 ||
          (i === 1 && allGroupsDone) ||
          (i >= 2 && allGroupsDone && thirdsCount === 8);
        const active = i === idx;
        return (
          <button
            key={s.key}
            disabled={!reachable}
            onClick={() => reachable && setStep(s.key)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors ${
              reachable ? "" : "opacity-40"
            }`}
          >
            <span className={`h-1 w-full rounded-full ${i <= idx ? "bg-forest" : "bg-gold/20"}`} />
            <span
              className={`label-caps text-[10px] ${active ? "text-forest" : "text-charcoal/50"}`}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StepHead({ n, title, desc, badge }: { n: string; title: string; desc: string; badge?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="eyebrow">Step {n}</p>
        <h2 className="display text-2xl text-forest">{title}</h2>
        <p className="mt-1 text-sm text-charcoal/70">{desc}</p>
      </div>
      {badge && <span className="chip shrink-0">{badge}</span>}
    </div>
  );
}

function NextBar({
  disabled,
  hint,
  onClick,
  label,
  onBack,
}: {
  disabled?: boolean;
  hint?: string;
  onClick: () => void;
  label: string;
  onBack?: () => void;
}) {
  return (
    <div className="sticky bottom-3 z-30 mt-4 flex items-center justify-between gap-3 rounded-full border border-gold/30 bg-cream/90 px-3 py-2 shadow-vintage-lg backdrop-blur">
      {onBack ? (
        <button className="btn btn-ghost text-sm" onClick={onBack}>
          ← Back
        </button>
      ) : (
        <span className="px-2 text-xs text-charcoal/50">{hint ?? ""}</span>
      )}
      <button className="btn btn-primary" disabled={disabled} onClick={onClick}>
        {label}
      </button>
    </div>
  );
}

function ThirdsStep({
  groups,
  orders,
  teamMap,
  thirds,
  toggle,
  locked,
  onBack,
  onNext,
  ready,
}: {
  groups: Group[];
  orders: Record<string, string[]>;
  teamMap: Map<string, Team>;
  thirds: string[];
  toggle: (g: string) => void;
  locked: boolean;
  onBack: () => void;
  onNext: () => void;
  ready: boolean;
}) {
  if (!ready)
    return <Gate msg="Finish ranking all 12 groups first." onBack={onBack} backLabel="← Back to groups" />;
  return (
    <section className="space-y-3">
      <StepHead
        n="2"
        title="Best 8 third-placed teams"
        desc="8 of the 12 group-3rd teams reach the Round of 32. Pick which 8 advance."
        badge={`${thirds.length}/8`}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {groups.map((g) => {
          const t = teamMap.get(orders[g.id]?.[2] ?? "");
          const on = thirds.includes(g.id);
          return (
            <button
              key={g.id}
              disabled={locked || (!on && thirds.length >= 8)}
              onClick={() => toggle(g.id)}
              className={`card flex items-center gap-3 p-3 text-left transition-colors disabled:opacity-50 ${
                on ? "!border-gold/70 bg-gold/15" : "hover:border-gold/40"
              }`}
            >
              <span className="label-caps w-8 text-xs text-charcoal/50">3{g.id}</span>
              {t && <Flag code={t.flag_code} size={26} />}
              <span className="flex-1 truncate text-sm font-medium text-charcoal">
                {t?.name ?? "—"}
              </span>
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                  on ? "bg-gold text-forest-deep" : "border border-dashed border-gold/40"
                }`}
              >
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
      <NextBar
        onBack={onBack}
        disabled={thirds.length !== 8}
        onClick={onNext}
        label="Next · fill the bracket"
      />
    </section>
  );
}

function BracketStep({
  resolved,
  teamMap,
  pickWinner,
  locked,
  champion,
  saved,
  ready,
  onBack,
  onNext,
}: {
  resolved: Record<number, Resolved>;
  teamMap: Map<string, Team>;
  pickWinner: (m: number, t: string) => void;
  locked: boolean;
  champion: string | null;
  saved: boolean;
  ready: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  if (!ready) return <Gate msg="Pick your 8 thirds first." onBack={onBack} backLabel="← Back to thirds" />;

  const rounds: { round: Round; ids: number[] }[] = [
    { round: "R32", ids: R32.map((m) => m.id) },
    { round: "R16", ids: KO.filter((m) => m.round === "R16").map((m) => m.id) },
    { round: "QF", ids: KO.filter((m) => m.round === "QF").map((m) => m.id) },
    { round: "SF", ids: KO.filter((m) => m.round === "SF").map((m) => m.id) },
    { round: "final", ids: [FINAL_MATCH] },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Step 3</p>
          <h2 className="display text-2xl text-forest">Fill the bracket</h2>
          <p className="mt-1 text-sm text-charcoal/70">Tap the team you predict to advance in each tie.</p>
        </div>
        <span className="chip shrink-0">{saved ? "saved ✓" : "saving…"}</span>
      </div>

      {champion && (
        <div className="card-forest flex items-center gap-3 p-4">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="label-caps text-[10px] text-gold">Your champion</p>
            <p className="display text-xl text-cream">{teamMap.get(champion)?.name}</p>
          </div>
        </div>
      )}

      {rounds.map(({ round, ids }) => (
        <div key={round} className="space-y-2">
          <p className="eyebrow">{ROUND_LABEL[round]}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ids.map((id) => (
              <MatchCard
                key={id}
                m={resolved[id]}
                teamMap={teamMap}
                onPick={(t) => pickWinner(id, t)}
                locked={locked}
              />
            ))}
          </div>
        </div>
      ))}

      <NextBar onBack={onBack} onClick={onNext} label="Review →" />
    </section>
  );
}

function MatchCard({
  m,
  teamMap,
  onPick,
  locked,
}: {
  m: Resolved | undefined;
  teamMap: Map<string, Team>;
  onPick: (t: string) => void;
  locked: boolean;
}) {
  const row = (teamId: string | null) => {
    const t = teamId ? teamMap.get(teamId) : null;
    const isWinner = teamId && m?.winner === teamId;
    const pickable = !locked && teamId;
    return (
      <button
        disabled={!pickable}
        onClick={() => teamId && onPick(teamId)}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
          isWinner ? "bg-gold/20" : "hover:bg-gold/[0.06]"
        } ${pickable ? "" : "cursor-default"}`}
      >
        {t ? (
          <>
            <Flag code={t.flag_code} size={22} />
            <span
              className={`flex-1 truncate text-sm ${
                isWinner ? "font-semibold text-forest" : "text-charcoal/80"
              }`}
            >
              {t.name}
            </span>
            {isWinner && <span className="text-gold-dark">✓</span>}
          </>
        ) : (
          <span className="flex-1 truncate text-sm italic text-charcoal/35">—</span>
        )}
      </button>
    );
  };
  return (
    <div className="card overflow-hidden !shadow-vintage-sm">
      {row(m?.a ?? null)}
      <div className="border-t border-gold/10" />
      {row(m?.b ?? null)}
    </div>
  );
}

function ReviewStep({
  champion,
  teamMap,
  completeGroups,
  thirdsCount,
  resolved,
  saved,
  onEdit,
}: {
  champion: string | null;
  teamMap: Map<string, Team>;
  completeGroups: number;
  thirdsCount: number;
  resolved: Record<number, Resolved>;
  saved: boolean;
  onEdit: () => void;
}) {
  const final = resolved[FINAL_MATCH];
  const finalists = [final?.a, final?.b].filter(Boolean) as string[];
  return (
    <section className="space-y-4">
      <StepHead n="4" title="Your full run" desc="Everything saves automatically. You can tweak until kickoff." />
      <div className="card-forest p-6 text-center">
        <p className="label-caps text-[10px] text-gold">Predicted champion</p>
        <p className="display mt-1 text-3xl text-cream">
          {champion ? teamMap.get(champion)?.name : "—"}
        </p>
        {finalists.length === 2 && (
          <p className="mt-2 text-sm text-cream/70">
            Final: {finalists.map((f) => teamMap.get(f)?.name).join(" vs ")}
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Groups" value={`${completeGroups}/12`} />
        <Stat label="Thirds" value={`${thirdsCount}/8`} />
        <Stat label="Saved" value={saved ? "✓" : "…"} />
      </div>
      <button className="btn btn-ghost w-full" onClick={onEdit}>
        Edit predictions
      </button>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-col items-center p-3">
      <span className="font-mono text-xl font-bold text-forest tabular">{value}</span>
      <span className="label-caps mt-0.5 text-[10px] text-charcoal/50">{label}</span>
    </div>
  );
}

function Gate({ msg, onBack, backLabel }: { msg: string; onBack: () => void; backLabel: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-sm text-charcoal/70">{msg}</p>
      <button className="btn btn-ghost mt-4" onClick={onBack}>
        {backLabel}
      </button>
    </div>
  );
}
