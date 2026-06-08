export type Team = {
  id: string;
  group_id: string;
  name: string;
  flag_code: string;
  seed: number;
};

export type Group = { id: string; name: string };

export type Competition = {
  id: string;
  league_id: string;
  type: "og_full" | "group_standings" | "third_place" | "knockout_bracket" | "qf_bracket";
  title: string;
  subtitle: string | null;
  opens_at: string | null;
  locks_at: string;
  status: "upcoming" | "open" | "locked" | "scored";
  scoring_config: ScoringConfig;
  sort_order: number;
};

export type ScoringConfig = {
  group?: {
    positions?: Record<string, number>;
    perfect_bonus?: number;
  };
  knockout?: Record<string, number>;
  third_place?: number;
};

export type GroupPrediction = {
  id: string;
  league_id: string;
  user_id: string;
  group_id: string;
  predicted_order: string[]; // 4 team ids
  updated_at: string;
};

export type GroupResult = {
  group_id: string;
  final_order: string[];
};

export type Profile = {
  id: string;
  display_name: string | null;
  is_admin: boolean;
};

export const LEAGUE_ID = "11111111-1111-1111-1111-111111111111";
