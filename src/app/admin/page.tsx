import { createClient } from "@/lib/supabase/server";
import {
  type Team,
  type Group,
  type Competition,
  type GroupResult,
} from "@/lib/types";
import { AdminLockForm } from "@/components/AdminLockForm";
import { AdminResults } from "@/components/AdminResults";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user!.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <div className="card p-8 text-center">
        <p className="display text-lg font-semibold text-forest">Admins only</p>
        <p className="mt-1 text-sm text-charcoal/70">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const [{ data: groups }, { data: teams }, { data: comps }, { data: results }] = await Promise.all([
    supabase.from("groups").select("*").order("id"),
    supabase.from("teams").select("*").order("group_id").order("seed"),
    supabase.from("competitions").select("*").eq("type", "group_standings").limit(1),
    supabase.from("group_results").select("*"),
  ]);

  const comp = (comps?.[0] ?? null) as Competition | null;
  const initial: Record<string, string[]> = {};
  for (const r of (results ?? []) as GroupResult[]) initial[r.group_id] = r.final_order;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Control room</p>
        <h1 className="display mt-1 text-2xl font-bold tracking-tight text-forest">Admin</h1>
        <p className="mt-1 text-sm text-charcoal/70">Set the lock time and enter real group results.</p>
      </header>

      {comp && <AdminLockForm locksAt={comp.locks_at} />}

      <section>
        <h2 className="eyebrow mb-1 px-1">Group results</h2>
        <p className="mb-3 px-1 text-sm text-charcoal/70">
          Rank each group&apos;s real final standings. Saving scores everyone instantly.
        </p>
        <AdminResults
          groups={(groups ?? []) as Group[]}
          teams={(teams ?? []) as Team[]}
          initial={initial}
        />
      </section>
    </div>
  );
}
