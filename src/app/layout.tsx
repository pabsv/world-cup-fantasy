import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Serif_4, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";

const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WC26 Fantasy",
  description: "Predict the 2026 World Cup with your friends. One league, many competitions.",
};

export const viewport: Viewport = {
  themeColor: "#1a3d2e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { display_name: string | null; is_admin: boolean } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, is_admin")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {user && (
          <NavBar
            userId={user.id}
            displayName={profile?.display_name ?? null}
            isAdmin={profile?.is_admin ?? false}
          />
        )}
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">{children}</main>
      </body>
    </html>
  );
}
