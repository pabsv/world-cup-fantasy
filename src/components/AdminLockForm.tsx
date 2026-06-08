"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminLockForm({ locksAt }: { locksAt: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [value, setValue] = useState(toLocalInput(locksAt));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(iso: string) {
    setState("saving");
    const { error } = await supabase
      .from("competitions")
      .update({ locks_at: iso })
      .in("type", ["group_standings", "og_full"]);
    setState(error ? "error" : "saved");
    if (!error) router.refresh();
  }

  const isPast = new Date(value).getTime() <= Date.now();

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="display font-semibold text-forest">Prediction lock</h2>
        <span className={`chip ${isPast ? "text-[#b91c1c]" : "text-gold-dark"}`}>
          {isPast ? "locked now" : "open"}
        </span>
      </div>
      <p className="mt-1 text-sm text-charcoal/70">
        When everyone&apos;s Full World Cup Prediction freezes and picks become public.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          className="input max-w-[16rem]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => save(new Date(value).toISOString())}>
          {state === "saving" ? "Saving…" : "Update"}
        </button>
        <button
          className="btn btn-ghost text-sm"
          onClick={() => save(new Date().toISOString())}
          title="Lock predictions immediately"
        >
          Lock now
        </button>
        {state === "saved" && <span className="text-sm text-gold-dark">Saved ✓</span>}
        {state === "error" && <span className="text-sm text-[#b91c1c]">Failed</span>}
      </div>
    </section>
  );
}
