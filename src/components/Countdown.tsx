"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
    done: ms === 0,
  };
}

function Unit({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono tabular text-3xl font-semibold text-cream sm:text-4xl">
        {value === null ? "––" : String(value).padStart(2, "0")}
      </span>
      <span className="label-caps mt-1.5 text-[10px] font-medium text-gold">{label}</span>
    </div>
  );
}

export function Countdown({ iso }: { iso: string }) {
  const target = new Date(iso).getTime();
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t?.done) {
    return (
      <div className="flex items-center gap-2 text-gold">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
        </span>
        <span className="display font-semibold">The tournament has kicked off</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 sm:gap-6">
      <Unit value={t?.days ?? null} label="days" />
      <span className="text-2xl text-gold/40">:</span>
      <Unit value={t?.hours ?? null} label="hrs" />
      <span className="text-2xl text-gold/40">:</span>
      <Unit value={t?.mins ?? null} label="min" />
      <span className="text-2xl text-gold/40">:</span>
      <Unit value={t?.secs ?? null} label="sec" />
    </div>
  );
}
