"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, Group } from "@/lib/types";
import { bracketProgress, resolveBracket } from "@/lib/bracket";
import { GroupRank } from "./GroupRank";
import { BracketTree } from "./BracketTree";
import { Flag } from "./Flag";

type Step = "groups" | "thirds" | "bracket";
const TABS: { key: Step; label: string }[] = [
  { key: "groups", label: "Groups" },
  { key: "thirds", label: "Best 3rd" },
  { key: "bracket", label: "Knockout" },
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
  const ko = useMemo(() => bracketProgress(winners), [winners]);

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

  // advance button changes per step
  const advance =
    step === "groups"
      ? { label: "Advance to Best 3rd", ready: allGroupsDone, go: () => setStep("thirds") }
      : step === "thirds"
        ? { label: "Advance to Knockout", ready: thirds.length === 8, go: () => setStep("bracket") }
        : null;

  return (
    <div className="space-y-5">
      <BracketHeader
        step={step}
        setStep={setStep}
        groupsDone={completeGroups.length}
        thirdsCount={thirds.length}
        ko={ko}
        saved={step === "bracket" ? bracketSaved : undefined}
        advance={advance}
        allGroupsDone={allGroupsDone}
        userId={userId}
      />

      {locked && (
        <div className="card-forest flex items-center gap-2 p-3 text-sm">
          🔒 Predictions are locked — this is your final OG Full Run.
        </div>
      )}

      {step === "groups" && (
        <section className="space-y-3">
          <StepHead
            title="Rank every group"
            desc="Tap teams 1st → 4th — they reorder as you go. Tap again to remove. This also feeds the Group Stage competition."
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
          ready={allGroupsDone}
        />
      )}

      {step === "bracket" && (
        <section className="space-y-3">
          {thirds.length === 8 ? (
            <>
              <StepHead
                title="The bracket"
                desc="Both halves of the draw meet at the final. Tap a team in each tie to send them through."
              />
              <BracketTree
                resolved={resolved}
                teamMap={teamMap}
                thirds={thirds}
                onPick={pickWinner}
                locked={locked}
              />
            </>
          ) : (
            <Gate msg="Pick your 8 thirds first." />
          )}
        </section>
      )}
    </div>
  );
}

// ── header ─────────────────────────────────────────────────────────────────────
function BracketHeader({
  step,
  setStep,
  groupsDone,
  thirdsCount,
  ko,
  saved,
  advance,
  allGroupsDone,
  userId,
}: {
  step: Step;
  setStep: (s: Step) => void;
  groupsDone: number;
  thirdsCount: number;
  ko: { picked: number; total: number };
  saved: boolean | undefined;
  advance: { label: string; ready: boolean; go: () => void } | null;
  allGroupsDone: boolean;
  userId: string;
}) {
  const [shared, setShared] = useState(false);
  const tabs = [
    { key: "groups" as Step, label: "Groups", count: `${groupsDone}/12`, reach: true },
    { key: "thirds" as Step, label: "Best 3rd", count: `${thirdsCount}/8`, reach: allGroupsDone },
    {
      key: "bracket" as Step,
      label: "Knockout",
      count: `${ko.picked}/${ko.total}`,
      reach: allGroupsDone && thirdsCount === 8,
    },
  ];
  const overall = Math.round(
    ((groupsDone + thirdsCount + ko.picked) / (12 + 8 + ko.total)) * 100,
  );
  const active = TABS.find((t) => t.key === step);

  function share() {
    const url = `${window.location.origin}/picks/${userId}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    });
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="display text-lg text-forest">
          {active?.label}{" "}
          <span className="text-sm tabular text-charcoal/40">
            {tabs.find((t) => t.key === step)?.count}
          </span>
        </h2>
        <span className="text-xs tabular text-charcoal/50">{overall}% complete</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gold/15">
        <div className="h-full bg-forest transition-all" style={{ width: `${overall}%` }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              disabled={!t.reach}
              onClick={() => t.reach && setStep(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                step === t.key
                  ? "bg-forest text-cream"
                  : t.reach
                    ? "bg-gold/10 text-forest hover:bg-gold/20"
                    : "bg-gold/5 text-charcoal/30"
              }`}
            >
              {t.label} <span className="tabular opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {saved !== undefined && <span className="chip">{saved ? "saved ✓" : "saving…"}</span>}
          {advance && (
            <button className="btn btn-primary text-sm" disabled={!advance.ready} onClick={advance.go}>
              {advance.label} →
            </button>
          )}
          {step === "bracket" && (
            <button className="btn btn-ghost text-sm" onClick={share}>
              {shared ? "Link copied ✓" : "Share bracket"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────
function StepHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="display text-2xl text-forest">{title}</h2>
      <p className="mt-1 text-sm text-charcoal/70">{desc}</p>
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
  ready,
}: {
  groups: Group[];
  orders: Record<string, string[]>;
  teamMap: Map<string, Team>;
  thirds: string[];
  toggle: (g: string) => void;
  locked: boolean;
  ready: boolean;
}) {
  if (!ready) return <Gate msg="Finish ranking all 12 groups first." />;
  return (
    <section className="space-y-3">
      <StepHead
        title="Best 8 third-placed teams"
        desc="8 of the 12 group-3rd teams reach the Round of 32. Pick which 8 advance."
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
    </section>
  );
}

function Gate({ msg }: { msg: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-sm text-charcoal/70">{msg}</p>
    </div>
  );
}
