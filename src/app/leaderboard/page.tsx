import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LEAGUE_ID, type Competition } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const tab = c ?? "overall";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: compsData } = await supabase
    .from("competitions")
    .select("*")
    .order("sort_order");
  const competitions = (compsData ?? []) as Competition[];
  const groupComp = competitions.find((cc) => cc.type === "group_standings");
  const kickoff = groupComp?.locks_at ?? "2026-06-11T19:00:00-06:00";
  const locked = new Date(kickoff).getTime() <= Date.now();

  // members of the league
  const { data: membersData } = await supabase
    .from("league_members")
    .select("user_id, profiles(display_name)")
    .eq("league_id", LEAGUE_ID);
  type MemberRow = { user_id: string; profiles: { display_name: string | null } | null };
  const members = (membersData ?? []) as unknown as MemberRow[];

  // points for the active tab
  const points = new Map<string, number>();
  if (tab === "overall") {
    const { data } = await supabase
      .from("v_league_leaderboard")
      .select("user_id, points")
      .eq("league_id", LEAGUE_ID);
    for (const r of data ?? []) points.set(r.user_id, r.points);
  } else {
    const { data } = await supabase
      .from("v_competition_leaderboard")
      .select("user_id, points")
      .eq("competition_id", tab);
    for (const r of data ?? []) points.set(r.user_id, r.points);
  }

  const rows = members
    .map((m) => ({
      id: m.user_id,
      name: m.profiles?.display_name ?? "Player",
      points: points.get(m.user_id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const tabs = [
    { key: "overall", label: "Overall" },
    ...competitions.map((cc) => ({ key: cc.id, label: cc.title })),
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted">
          {locked ? "Live standings across the league." : "Standings go live once predictions lock at kickoff."}
        </p>
      </header>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/leaderboard?c=${t.key}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="card divide-y divide-[var(--border)]">
        {rows.map((r, i) => {
          const me = r.id === user?.id;
          return (
            <Link
              key={r.id}
              href={locked ? `/picks/${r.id}` : "#"}
              className={`flex items-center gap-3 px-4 py-3 ${
                locked ? "transition-colors hover:bg-white/[0.03]" : "pointer-events-none"
              }`}
            >
              <span className="w-6 text-center text-sm font-bold tabular text-muted">
                {i + 1}
              </span>
              <Avatar name={r.name} id={r.id} size={32} />
              <span className="flex-1 truncate font-medium">
                {r.name}
                {me && <span className="ml-2 chip">you</span>}
              </span>
              <span className="tabular text-lg font-bold">
                {r.points}
                <span className="ml-1 text-xs font-normal text-muted">pts</span>
              </span>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">No players yet.</p>
        )}
      </div>
    </div>
  );
}
