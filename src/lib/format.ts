import type { ScoringConfig } from "./types";

/** Flag image from flagcdn (supports gb-eng, gb-sct, etc.). */
export function flagUrl(code: string, w: 40 | 80 | 160 = 80) {
  return `https://flagcdn.com/w${w}/${code}.png`;
}

export const POSITION_LABEL: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
};

/** Points awarded for getting a given position (1-indexed) exactly right. */
export function positionPoints(cfg: ScoringConfig, position: number): number {
  return cfg.group?.positions?.[String(position)] ?? 0;
}

export function perfectBonus(cfg: ScoringConfig): number {
  return cfg.group?.perfect_bonus ?? 0;
}

/** Points for one group given predicted vs final order (both arrays of team ids). */
export function scoreGroup(
  cfg: ScoringConfig,
  predicted: string[],
  final: string[],
): number {
  let pts = 0;
  for (let i = 0; i < 4; i++) {
    if (predicted[i] && predicted[i] === final[i]) pts += positionPoints(cfg, i + 1);
  }
  const perfect = predicted.length === 4 && predicted.every((t, i) => t === final[i]);
  if (perfect) pts += perfectBonus(cfg);
  return pts;
}

export function maxGroupPoints(cfg: ScoringConfig): number {
  return (
    positionPoints(cfg, 1) +
    positionPoints(cfg, 2) +
    positionPoints(cfg, 3) +
    positionPoints(cfg, 4) +
    perfectBonus(cfg)
  );
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
}
