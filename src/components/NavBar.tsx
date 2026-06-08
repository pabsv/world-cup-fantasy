"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/predict", label: "Predict" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function NavBar({
  userId,
  displayName,
  isAdmin,
}: {
  userId: string;
  displayName: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm font-black text-[var(--accent-ink)]">
            ⚽
          </span>
          <span className="text-sm font-bold tracking-tight">
            WC26 <span className="text-muted font-medium">Fantasy</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={signOut}
            title="Sign out"
            className="ml-1 flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-white/5"
          >
            <Avatar name={displayName} id={userId} size={26} />
          </button>
        </nav>
      </div>
    </header>
  );
}
