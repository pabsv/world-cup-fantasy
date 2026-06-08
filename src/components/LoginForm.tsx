"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() || email.split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("Account created. If email confirmation is on, check your inbox — otherwise just sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setInfo(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === m ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Display name</label>
            <input
              className="input"
              placeholder="What friends will see"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
          <input
            className="input"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Password</label>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-[rgba(248,113,113,0.1)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-[rgba(52,211,153,0.1)] px-3 py-2 text-sm text-accent-strong">
            {info}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
