# World Cup 2026 Fantasy — Project Memory

Online World Cup 2026 prediction game to play with friends. Replaces a Spanish "porra" Excel (`Excel-Mundial-2026.xlsx` in this folder) with an online version. Full design lives in **[PLAN.md](PLAN.md)** — read it before building.

## Status
- **v2 built 2026-06-08.** Repo: https://github.com/pabsv/world-cup-fantasy (public). Working: public landing (`/` logged-out) + dashboard (logged-in), auth (email+password), **`/predict` = the OG Full Run builder** (groups → 8 thirds → full knockout bracket → champion, autosave), `/leaderboard` (now titled "League"), `/picks/[userId]`, `/admin`.
- **UI = "vintage almanac" theme** (forest #1a3d2e + gold #c9a227 + cream #f5f1e8, Playfair Display serif, mahogany shadows, gold hairline borders) — copied from wcpredictor.app. Tokens in `src/app/globals.css`.
- **Bracket = exact 2026 structure.** `src/lib/bracket.ts` (R32 slot defs, M89→104 tree) + `src/lib/thirdsTable.json` (the official 495-row Annex C third-place allocation, scraped via `scripts/build-thirds.mjs`). All 495 allocations validated against per-match eligibility. Verified end-to-end (groups→thirds→bracket→champion persists to `bracket_predictions.payload`).
- **Next:** OG knockout SCORING (capture works; scoring accrues as `bracket_results` are entered — admin UI for knockout results still TODO). 3rd-place + knockout competitions. Deploy to Vercel.
- ⚠️ A test account `pablovegarzv2@gmail.com` ("Pabs") exists with predictions — the owner's own test acct, left in place.
- Hard deadline: **World Cup opens June 11, 2026.** Group stage June 11–27, knockouts from June 28, final July 19.

## Core concept
- **One league → many competitions.** Each competition = its own prediction round, deadline, scoring, leaderboard. League also has an overall leaderboard.
- 5 planned competitions: (1) **OG Full Run** = predict whole tournament up front; (2) **Group Stage**; (3) **3rd-Place Playoff**; (4) **Knockout Bracket** with real teams; (5) **QF Bracket**.
- Predictions are **standings/winners only — no match scores, no money, no betting** (deferred). Single global league for now (multi-league later).
- **MVP = competitions #1 + #2.** #2 = full loop (rank 12 groups → lock → admin results → auto-score → leaderboard). #1 = capture full bracket up front before kickoff; its knockout scoring accrues later as results are entered.

## Scoring (Group Stage, tunable)
Per correct group position: 1st = 5, 2nd = 3, 3rd = 2, 4th = 1; all-4-perfect bonus +5. Max 192. Winner-weighted on purpose ("1st preferred, never worth less going down"). Lives in `competitions.scoring_config` / a `CASE` in `v_group_scores`.

## Stack
- **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4**, mobile-first, **dark theme** inspired by https://wcpredictor.app. App is dark-only; theme tokens in `src/app/globals.css` (emerald accent `#34d399`, pink highlight). Auth/session via `@supabase/ssr` (browser+server clients in `src/lib/supabase/`, session refresh in `src/proxy.ts`).
- **Auth = email + password** (NOT magic-link — chosen to avoid Supabase free-tier email rate limits when friends all sign up before the deadline). Owner `pablovegarzv@gmail.com` is auto-admin via the signup trigger. **Friends signup needs "Confirm email" = OFF** in Supabase → Auth → Providers → Email (else signUp returns no session). Magic-link is an easy future swap.
- **Supabase** (Postgres + Auth + RLS). Deploy on **Vercel** (free). Results entered manually by admin via `/admin`.

## Supabase — TWO separate projects, do not mix
- **WCF (this app): ref `ynqbbkxfhlrpcwavuhea`**, org "WorldCupFantasy", region eu-central-1. URL `https://ynqbbkxfhlrpcwavuhea.supabase.co`. Publishable key (frontend): `sb_publishable_Ig-_Jmzmiq4og7FYC-9DDQ_EuAhHmPp`.
- ⚠️ **The Supabase MCP server is bound to a DIFFERENT project** (`qhvmpbkgzbnislbfjlue` = the user's "Life OS"/todo app). **NEVER use the Supabase MCP for WCF** — it writes to the wrong DB. Apply WCF SQL via the direct-Postgres scripts below.
- DB connection (migrations/scripts): **session pooler** `aws-1-eu-central-1.pooler.supabase.com:5432`, user `postgres.ynqbbkxfhlrpcwavuhea`. Direct `db.<ref>.supabase.co` does NOT resolve here (IPv6-only). Helpers auto-try hosts.
- **Secrets** (DB password, secret key) live ONLY in gitignored `.env.local`. Migrations are versioned files in `supabase/migrations/`.

## ⚠️ Security TODO (still pending)
DB password AND the `sb_secret_…` secret key were **pasted in chat** — both must be **rotated** before real deploy (Settings → Database → Reset password; Settings → API keys → roll secret). Update `.env.local` after.

## Data model (summary — full in PLAN.md)
`profiles` · `leagues` · `league_members` · `competitions` · `groups` (A–L) · `teams` (48) · `group_predictions` · `group_results` · `bracket_predictions` · `bracket_results`. Scoring via SQL views `v_group_scores`, `v_competition_leaderboard`, `v_league_leaderboard`.
- **Deviation from PLAN (intentional, cleaner):** `group_predictions` is **league-scoped** (one set per user, shared by both Group Stage + OG Full Run — they lock together and ask the same question, no double entry). `group_results`/`bracket_results` are **global truth** keyed by group/slot (not per-competition). Competitions are **scoring lenses** over shared predictions. `wcf_predictions_locked()` (= min `locks_at` of the up-front comps) gates edits + RLS visibility. Views use `security_invoker` so others' picks stay hidden until lock.
- Note: today **overall = group×2** (both comps reward the same group picks); it diverges once OG knockout scoring lands.

## Gotchas
- **Draw data is REAL & verified** (Wikipedia 2026 final draw + the Excel agree exactly) — seeded in `supabase/migrations/..._seed.sql`. Excel was NOT a fan template.
- Knockout **bracket structure** (2026 R32→final slotting, incl. 8 best-thirds assignment) will be a code constant (`src/lib/bracket.ts`), not a DB table — to build with the OG bracket UI.
- Kickoff date label must render in `America/Mexico_City` TZ (else a European viewer sees "June 12"). Countdown instant is `2026-06-11T19:00-06:00`.
- Demo users (seeded): `alex@wc26.local` (admin), `sam@`, `jordan@` — password `worldcup26`.

## Common ops
- Local dev: `npm run dev` (or preview via `.claude/launch.json` server "wcf", port 3000).
- Apply migrations: `node scripts/migrate.mjs` (direct Postgres; tracks applied in `_wcf_migrations`).
- Ad-hoc SQL: `node scripts/sql.mjs "select ..."`. Rebuild thirds table: `node scripts/build-thirds.mjs`.
- Demo/test users: `node scripts/seed-demo.mjs` (create), `node scripts/clean-demo.mjs` (wipe all users+data), `node scripts/temp-user.mjs create|delete`.
- DO NOT use the Supabase MCP (wrong project — see above).
- Deploy: push to Vercel (repo connected); set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars there.
- ⚠️ Friends signup needs Supabase **Auth → Email → "Confirm email" OFF** (can't be toggled via API — owner does it in dashboard).
