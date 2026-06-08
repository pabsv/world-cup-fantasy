"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/predict", label: "Predict" },
  { href: "/leaderboard", label: "League" },
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
    <header className="sticky top-0 z-40 border-b border-gold/25 bg-forest text-cream">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-sm">🏆</span>
          <span className="display text-base font-bold">
            WC26 <span className="font-normal text-cream/70">Fantasy</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-cream/15 text-cream" : "text-cream/70 hover:text-cream"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={signOut}
            title="Sign out"
            className="ml-1 flex items-center gap-2 rounded-full p-0.5 hover:bg-cream/10"
          >
            <Avatar name={displayName} id={userId} size={26} />
          </button>
        </nav>
      </div>
    </header>
  );
}
