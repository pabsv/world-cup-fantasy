"use client";

import type { Team } from "@/lib/types";
import { Flag } from "./Flag";
import { abbr } from "@/lib/teamAbbr";
import {
  LEFT_ORDER,
  RIGHT_ORDER,
  PARENT,
  r32Labels,
  ROUND_LABEL,
  FINAL_MATCH,
  type Resolved,
  type Round,
} from "@/lib/bracket";

type Side = "lft" | "rgt";
type Ctx = {
  resolved: Record<number, Resolved>;
  teamMap: Map<string, Team>;
  thirds: string[];
  onPick: (matchId: number, teamId: string) => void;
  locked: boolean;
};

/** Single box (R16 → final): shows the winner of `feed`, advances into PARENT[feed]. */
function Box({ feed, side, ctx }: { feed: number; side: Side; ctx: Ctx }) {
  const teamId = ctx.resolved[feed]?.winner ?? null;
  const t = teamId ? ctx.teamMap.get(teamId) : null;
  const parent = PARENT[feed];
  const picked = t ? ctx.resolved[parent]?.winner === t.id : false;
  const pickable = !!t && !ctx.locked;
  return (
    <button
      className={`bkt-box fed ${side} ${picked ? "win" : ""} ${pickable ? "pickable" : ""}`}
      disabled={!pickable}
      onClick={() => t && ctx.onPick(parent, t.id)}
    >
      {t ? (
        <>
          <Flag code={t.flag_code} size={16} />
          <span className="ab">{abbr(t.name)}</span>
        </>
      ) : (
        <span className="ph">—</span>
      )}
    </button>
  );
}

/** R32 two-team card — pick the winner of this tie. */
function R32Card({ id, side, ctx }: { id: number; side: Side; ctx: Ctx }) {
  const m = ctx.resolved[id];
  const labels = r32Labels(id, ctx.thirds);
  const row = (teamId: string | null, label: string) => {
    const t = teamId ? ctx.teamMap.get(teamId) : null;
    const win = t ? m?.winner === t.id : false;
    const pickable = !!t && !ctx.locked;
    return (
      <button
        className={`row ${win ? "win" : ""} ${pickable ? "pickable" : ""}`}
        disabled={!pickable}
        onClick={() => t && ctx.onPick(id, t.id)}
      >
        <span className="slot">{label}</span>
        {t ? (
          <>
            <Flag code={t.flag_code} size={16} />
            <span className="ab">{abbr(t.name)}</span>
          </>
        ) : (
          <span className="ph">—</span>
        )}
      </button>
    );
  };
  return (
    <div className={`bkt-r32 ${side}`}>
      {row(m?.a ?? null, labels.a)}
      {row(m?.b ?? null, labels.b)}
    </div>
  );
}

function Col({
  side,
  round,
  items,
  kind,
  merge,
  ctx,
}: {
  side: Side;
  round: Round;
  items: number[];
  kind: "r32" | "box";
  merge?: boolean;
  ctx: Ctx;
}) {
  return (
    <div className={`bkt-col ${side} ${merge ? "merge" : ""}`}>
      <div className="bkt-head">{ROUND_LABEL[round]}</div>
      <div className="bkt-col-body">
        {items.map((id) => (
          <div className="bkt-cell" key={id}>
            {kind === "r32" ? (
              <R32Card id={id} side={side} ctx={ctx} />
            ) : (
              <Box feed={id} side={side} ctx={ctx} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full two-sided knockout tree (desktop). Both halves converge on the centre Final.
    R32 = two-team cards (pick a winner); R16→Final = single-team boxes that show the
    winner of the feeding match and advance when tapped. */
export function BracketTree({
  resolved,
  teamMap,
  thirds,
  onPick,
  locked,
}: {
  resolved: Record<number, Resolved>;
  teamMap: Map<string, Team>;
  thirds: string[];
  onPick: (matchId: number, teamId: string) => void;
  locked: boolean;
}) {
  const ctx: Ctx = { resolved, teamMap, thirds, onPick, locked };
  const champion = resolved[FINAL_MATCH]?.winner ?? null;

  return (
    <div className="bkt-scroll">
      <div className="bkt-body">
        {/* LEFT half */}
        <Col side="lft" round="R32" kind="r32" items={LEFT_ORDER.R32} ctx={ctx} />
        <Col side="lft" round="R16" kind="box" merge items={LEFT_ORDER.R32} ctx={ctx} />
        <Col side="lft" round="QF" kind="box" merge items={LEFT_ORDER.R16} ctx={ctx} />
        <Col side="lft" round="SF" kind="box" merge items={LEFT_ORDER.QF} ctx={ctx} />

        {/* FINAL (centre) */}
        <div className="bkt-col final">
          <div className="bkt-head">{ROUND_LABEL.final}</div>
          <div className="bkt-col-body">
            <div className="bkt-final-wrap">
              <Box feed={LEFT_ORDER.SF[0]} side="lft" ctx={ctx} />
              <div className={`bkt-champ ${champion ? "on" : ""}`}>
                <span className="cap">🏆 Champion</span>
                <span className="name">{champion ? abbr(teamMap.get(champion)?.name) : "—"}</span>
              </div>
              <Box feed={RIGHT_ORDER.SF[0]} side="rgt" ctx={ctx} />
            </div>
          </div>
        </div>

        {/* RIGHT half (visual order SF → R32 outward) */}
        <Col side="rgt" round="SF" kind="box" merge items={RIGHT_ORDER.QF} ctx={ctx} />
        <Col side="rgt" round="QF" kind="box" merge items={RIGHT_ORDER.R16} ctx={ctx} />
        <Col side="rgt" round="R16" kind="box" merge items={RIGHT_ORDER.R32} ctx={ctx} />
        <Col side="rgt" round="R32" kind="r32" items={RIGHT_ORDER.R32} ctx={ctx} />
      </div>
    </div>
  );
}
