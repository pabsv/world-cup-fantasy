// 2026 FIFA World Cup knockout structure — encoded from verified sources
// (Wikipedia "2026 FIFA World Cup knockout stage" + the 495-row Annex C
// third-place table in thirdsTable.json). Match numbers are the official ones.
import thirdsTableRaw from "./thirdsTable.json";

const thirdsTable = thirdsTableRaw as Record<string, string[]>;

export const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export type Round = "R32" | "R16" | "QF" | "SF" | "final";

// Slot references used to fill each match.
type Slot =
  | { k: "W"; g: string } // winner of group g
  | { k: "R"; g: string } // runner-up of group g
  | { k: "3" } // a third-placed team (resolved via the allocation table per match)
  | { k: "M"; m: number }; // winner of match m

// Round of 32 (matches 73–88), in match-number order.
export const R32: { id: number; a: Slot; b: Slot }[] = [
  { id: 73, a: { k: "R", g: "A" }, b: { k: "R", g: "B" } },
  { id: 74, a: { k: "W", g: "E" }, b: { k: "3" } },
  { id: 75, a: { k: "W", g: "F" }, b: { k: "R", g: "C" } },
  { id: 76, a: { k: "W", g: "C" }, b: { k: "R", g: "F" } },
  { id: 77, a: { k: "W", g: "I" }, b: { k: "3" } },
  { id: 78, a: { k: "R", g: "E" }, b: { k: "R", g: "I" } },
  { id: 79, a: { k: "W", g: "A" }, b: { k: "3" } },
  { id: 80, a: { k: "W", g: "L" }, b: { k: "3" } },
  { id: 81, a: { k: "W", g: "D" }, b: { k: "3" } },
  { id: 82, a: { k: "W", g: "G" }, b: { k: "3" } },
  { id: 83, a: { k: "R", g: "K" }, b: { k: "R", g: "L" } },
  { id: 84, a: { k: "W", g: "H" }, b: { k: "R", g: "J" } },
  { id: 85, a: { k: "W", g: "B" }, b: { k: "3" } },
  { id: 86, a: { k: "W", g: "J" }, b: { k: "R", g: "H" } },
  { id: 87, a: { k: "W", g: "K" }, b: { k: "3" } },
  { id: 88, a: { k: "R", g: "D" }, b: { k: "R", g: "G" } },
];

// Knockout tree (matches 89–104). Each fed by the winners of two earlier matches.
export const KO: { id: number; round: Round; a: number; b: number }[] = [
  { id: 89, round: "R16", a: 74, b: 77 },
  { id: 90, round: "R16", a: 73, b: 75 },
  { id: 91, round: "R16", a: 76, b: 78 },
  { id: 92, round: "R16", a: 79, b: 80 },
  { id: 93, round: "R16", a: 83, b: 84 },
  { id: 94, round: "R16", a: 81, b: 82 },
  { id: 95, round: "R16", a: 86, b: 88 },
  { id: 96, round: "R16", a: 85, b: 87 },
  { id: 97, round: "QF", a: 89, b: 90 },
  { id: 98, round: "QF", a: 93, b: 94 },
  { id: 99, round: "QF", a: 91, b: 92 },
  { id: 100, round: "QF", a: 95, b: 96 },
  { id: 101, round: "SF", a: 97, b: 98 },
  { id: 102, round: "SF", a: 99, b: 100 },
  { id: 104, round: "final", a: 101, b: 102 },
];

// The 8 R32 matches with a third-place slot, in the allocation table's column
// order [1A,1B,1D,1E,1G,1I,1K,1L]. thirdsTable value[col] -> group whose 3rd fills COLUMN_TO_MATCH[col].
export const COLUMN_TO_MATCH = [79, 85, 81, 74, 82, 77, 87, 80];
export const THIRD_MATCH_IDS = [74, 77, 79, 80, 81, 82, 85, 87];

export const ROUND_OF: Record<number, Round> = (() => {
  const m: Record<number, Round> = {};
  for (const x of R32) m[x.id] = "R32";
  for (const x of KO) m[x.id] = x.round;
  return m;
})();

export const ROUND_LABEL: Record<Round | "champion", string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  final: "Final",
  champion: "Champion",
};

export type Resolved = { a: string | null; b: string | null; winner: string | null };

/** Which group's third-placed team fills each third-slot match, given the chosen 8 thirds. */
export function thirdGroupByMatch(thirds: string[]): Record<number, string> {
  const key = [...thirds].sort().join("");
  const value = thirdsTable[key];
  const out: Record<number, string> = {};
  if (!value) return out;
  COLUMN_TO_MATCH.forEach((m, col) => {
    out[m] = value[col];
  });
  return out;
}

/**
 * Resolve every match's two teams + chosen winner.
 * - groupOrder: group letter -> [1st,2nd,3rd,4th] team ids (from the user's group ranking)
 * - thirds: 8 group letters whose third-placed team the user predicts to advance
 * - winners: matchId -> picked winning team id
 */
export function resolveBracket(
  groupOrder: Record<string, string[]>,
  thirds: string[],
  winners: Record<number, string>,
): Record<number, Resolved> {
  const thirdBy = thirdGroupByMatch(thirds);
  const res: Record<number, Resolved> = {};

  const teamForSlot = (slot: Slot, matchId: number): string | null => {
    if (slot.k === "W") return groupOrder[slot.g]?.[0] ?? null;
    if (slot.k === "R") return groupOrder[slot.g]?.[1] ?? null;
    if (slot.k === "3") {
      const g = thirdBy[matchId];
      return g ? (groupOrder[g]?.[2] ?? null) : null;
    }
    return res[slot.m]?.winner ?? null;
  };

  for (const m of R32) {
    const a = teamForSlot(m.a, m.id);
    const b = teamForSlot(m.b, m.id);
    const w = winners[m.id];
    res[m.id] = { a, b, winner: w === a || w === b ? w : null };
  }
  for (const m of KO) {
    const a = res[m.a]?.winner ?? null;
    const b = res[m.b]?.winner ?? null;
    const w = winners[m.id];
    res[m.id] = { a, b, winner: w === a || w === b ? w : null };
  }
  return res;
}

export const FINAL_MATCH = 104;

export const KO_ROUNDS: Round[] = ["R32", "R16", "QF", "SF", "final"];

// Left half feeds SF 101, right half feeds SF 102. Walk parents down to R32 leaves.
function collectSide(root: number): Set<number> {
  const koById = new Map(KO.map((m) => [m.id, m]));
  const out = new Set<number>();
  const stack = [root];
  while (stack.length) {
    const id = stack.pop()!;
    out.add(id);
    const ko = koById.get(id);
    if (ko) stack.push(ko.a, ko.b);
  }
  return out;
}
const LEFT = collectSide(101);
const RIGHT = collectSide(102);

/** Match ids for one round, split into left/right halves of the draw, in stable order. */
export function roundHalves(round: Round): { left: number[]; right: number[] } {
  if (round === "final") return { left: [FINAL_MATCH], right: [] };
  const ids =
    round === "R32"
      ? R32.map((m) => m.id)
      : KO.filter((m) => m.round === round).map((m) => m.id);
  return {
    left: ids.filter((id) => LEFT.has(id)),
    right: ids.filter((id) => RIGHT.has(id)),
  };
}

/** Count of winners picked across all knockout matches (for progress). */
export function bracketProgress(winners: Record<number, string>): { picked: number; total: number } {
  const total = R32.length + KO.length; // 16 + 15 = 31
  const picked = [...R32, ...KO].filter((m) => winners[m.id]).length;
  return { picked, total };
}

// ── full two-sided bracket tree (desktop) ────────────────────────────────────

/** Parent KO match each match feeds into (R32 + KO ids → the match above them). */
export const PARENT: Record<number, number> = (() => {
  const p: Record<number, number> = {};
  for (const m of KO) {
    p[m.a] = m.id;
    p[m.b] = m.id;
  }
  return p;
})();

/** Per-round match ids under a side root, in top→bottom bracket order (DFS a-before-b). */
export function treeOrder(root: number): Record<Round, number[]> {
  const koById = new Map(KO.map((m) => [m.id, m]));
  const out: Record<Round, number[]> = { R32: [], R16: [], QF: [], SF: [], final: [] };
  const visit = (id: number) => {
    const ko = koById.get(id);
    if (!ko) {
      out.R32.push(id);
      return;
    }
    out[ko.round].push(id);
    visit(ko.a);
    visit(ko.b);
  };
  visit(root);
  return out;
}
export const LEFT_ORDER = treeOrder(101); // feeds SF 101
export const RIGHT_ORDER = treeOrder(102); // feeds SF 102

/** Qualification-slot labels (e.g. "1E", "2A", "3C") for an R32 match's two teams. */
export function r32Labels(matchId: number, thirds: string[]): { a: string; b: string } {
  const m = R32.find((x) => x.id === matchId);
  if (!m) return { a: "", b: "" };
  const thirdBy = thirdGroupByMatch(thirds);
  const lab = (s: Slot): string =>
    s.k === "W" ? `1${s.g}` : s.k === "R" ? `2${s.g}` : s.k === "3" ? (thirdBy[matchId] ? `3${thirdBy[matchId]}` : "3?") : "";
  return { a: lab(m.a), b: lab(m.b) };
}
