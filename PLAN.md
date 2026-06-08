# World Cup 2026 Fantasy — Implementation Plan

## Context

User wants an online prediction game to play with friends during World Cup 2026, replacing a Spanish "porra" Excel (`Excel-Mundial-2026.xlsx`) they already use. The tournament **opens June 11, 2026** — so the goal is to ship a working MVP fast and add the rest during the tournament (group stage runs June 11–27; knockouts start June 28; final July 19).

Decided constraints:
- **No match-score predictions, no money, no coins, no betting.** Pure prediction points.
- **One single global league** for everyone for now (no league creation / invites yet) — but the schema is modeled for multiple leagues later.
- UI takes **big inspiration from https://wcpredictor.app** (clean, dark, card-based, countdown timer). Its "Quick Standings" mode = ranking each group's 4 teams = exactly our first competition; it also runs **separate leaderboards per mode**, validating the multi-competition design below.

## Core architecture: one league → many competitions

A **league** contains multiple **competitions**. Each competition is an independent prediction round with its own open/lock deadline, its own prediction shape, its own scoring, and its own leaderboard. The league also has an **overall** leaderboard aggregating across competitions. The 5 planned competitions:

1. **OG Full Run** — at the very start, predict the *entire* World Cup (group standings → full bracket → champion). One submission up front, scored as reality unfolds across the whole tournament. "Most accurate predictor of the full thing."
2. **Group Stage** — scored purely on the group-stage outcome (the group-standings portion). Can reuse the same group-order input as the OG run's group section.
3. **3rd-Place Playoff** — mini competition: predict which of the 12 third-placed teams make the 8 qualifying spots. Opens after group stage (recalibrate with real results).
4. **Knockout Bracket** — predict the full knockout bracket using the *actual* qualified teams. Opens once the Round-of-32 field is set (~June 28).
5. **QF Bracket (maybe)** — one more bracket prediction at the quarterfinals with the remaining teams, for fun.

Each later competition opens only after the previous resolves, so predictions never go stale — the user's "recalibrate at each stage" goal.

## What we build first (MVP) — two competitions

**Decided:** ship BOTH the Group Stage and the OG Full Run, so the "predict everything up front" bet is collected before the June 11 kickoff.

- **A) Group Stage (#2) — full loop:** rank all 4 teams in each of the 12 groups → lock at kickoff → admin enters real final standings → auto-score → leaderboard.
- **B) OG Full Run (#1) — capture now, score over time:** one up-front submission of the entire tournament: group standings (reuses the same ranking input) → which 8 third-place teams advance → full knockout bracket (R32 → champion). Priority is **capturing** these predictions before kickoff; OG knockout **scoring** accrues later as the admin enters knockout results (no knockout result exists until June 28, so there's time to finish that scoring this week).

Competitions #3–#5 remain fast-follows (see Roadmap).

### Tech stack
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind, mobile-first, **dark theme** à la wcpredictor.app. Deploy on Vercel (free).
- **Backend/DB/Auth:** Supabase (project `ynqbbkxfhlrpcwavuhea`) — Postgres + Auth + Row Level Security. Migrations via Supabase MCP `apply_migration`.
- **Results:** manual entry by admin (user) on an admin-only page. No football API yet (later enhancement).
- **Auth:** Supabase email magic-link (no passwords; fine for a small group).

### Data model (Postgres)
- `profiles` — `id uuid PK` (= `auth.users.id`), `display_name`, `is_admin bool default false`, `created_at`. Auto-created on signup via trigger.
- `leagues` — `id uuid PK`, `name`, `join_code text null`, `created_by`. Seed one global league.
- `league_members` — `(league_id, user_id) PK`, `role`. MVP: everyone auto-joins the global league.
- `competitions` — `id uuid PK`, `league_id FK`, `type text` ('og_full' | 'group_standings' | 'third_place' | 'knockout_bracket' | 'qf_bracket'), `title`, `opens_at`, `locks_at timestamptz`, `status`, `scoring_config jsonb`. First migration: insert TWO rows — `group_standings` and `og_full`; both `locks_at` = June 11 kickoff.
- `groups` — `id text PK` ('A'..'L'), `name`.
- `teams` — `id uuid PK`, `group_id FK`, `name`, `flag_code`. 48 rows.
- `group_predictions` — `id uuid PK`, `competition_id FK`, `user_id FK`, `group_id FK`, `predicted_order uuid[]` (4 team ids in predicted order), `updated_at`. **Unique(competition_id, user_id, group_id)**. (Typed table for clean SQL scoring; future bracket competitions get their own typed tables / jsonb payloads.)
- `group_results` — `(competition_id, group_id) PK`, `final_order uuid[]`, `entered_by`, `entered_at`. Admin-entered.
- `bracket_predictions` — `id uuid PK`, `competition_id FK`, `user_id FK`, `payload jsonb` (predicted qualifying thirds + predicted winner at each bracket slot R32→final + champion), `updated_at`. **Unique(competition_id, user_id)**. Used by OG Full Run (and later knockout competitions).
- `bracket_results` — `(competition_id, round, slot) PK`, `team_id`, `entered_by`, `entered_at`. Admin-entered actual advancing teams per round, for OG knockout scoring.
- Knockout bracket **structure** (R32 slot → feeds → R16 → …) encoded as a constant in app code (official 2026 slotting), not a DB table.

**Scoring as SQL views:**
- `v_group_scores` — compares `predicted_order` vs `final_order` position-by-position, emits points per (competition, user, group).
- `v_competition_leaderboard(competition_id, user_id, points)` and `v_league_leaderboard(league_id, user_id, points)` (sum across competitions = the overall standing).

### Scoring rules (Group Stage) — winner-weighted, tunable
For each group, per position the user got exactly right:

| Position correct | Points |
|---|---|
| 1st (group winner) | **5** |
| 2nd | **3** |
| 3rd | **2** |
| 4th | **1** |
| All 4 exactly right (bonus) | **+5** |

Max 16/group × 12 = **192**. Honors "1st preferred, never worth less going down." Values live in `competitions.scoring_config` (jsonb) or a single `CASE` in `v_group_scores` — retunable without touching app code.

**OG Full Run scoring:** group-standings portion uses the same table above; knockout portion awards escalating points per correctly-predicted advancing team — e.g. R32 qualifier = 1, R16 = 2, QF = 4, SF = 6, finalist = 8, champion = 12 (tunable in `scoring_config`). Computed as actual results are entered; until knockouts begin, the OG leaderboard reflects only the group portion.

### Security (RLS)
- `profiles`: authed `select` all; `update` own only.
- `group_predictions`: user `insert`/`update`/`select` **own**; writes only while `now() < competitions.locks_at`; others' rows `select`-able only **after** lock (via a `SECURITY DEFINER` helper reading the competition lock).
- `group_results`: `select` all authed; write only where `profiles.is_admin`.
- `leagues`, `league_members`, `competitions`, `groups`, `teams`: `select` for authed.

### App routes (Next.js)
- `/login` — magic-link sign-in; capture `display_name` on first login.
- `/` — home: **countdown to kickoff**, your status (X/12 groups predicted), links to Predict + Leaderboard, scoring-explainer cards (wcpredictor style).
- `/predict` — Group Stage: the 12 groups; per group rank the 4 teams 1→4 (tap up/down; drag-drop as enhancement). Upsert per group. Read-only after lock.
- `/predict/bracket` — OG Full Run: step flow — group standings (shared input with `/predict`) → pick the 8 qualifying third-place teams → fill the knockout bracket (winners R32→final + champion). Saved as `bracket_predictions.payload`. Read-only after lock.
- `/leaderboard` — overall + per-competition standings from the views; after lock, rows link to picks.
- `/picks/[userId]` — a user's locked predictions + per-group points once results are in.
- `/admin` — **admin-only**: enter each group's final order, set/edit `locks_at`. Guarded by `is_admin`.

### Seed data
Seed the 12 official WC2026 groups + 48 teams. The Excel `Pool` sheet has a full A–L breakdown as a starting point — **verify against the official FIFA draw during build** (Excel may be a fan template).

## Project files (created)
1. **`CLAUDE.md`** at project root — project memory: architecture summary, the 5-competition vision, stack, Supabase **non-secret** config (project URL, ref, publishable key), common ops, and a pointer that secrets live in gitignored `.env.local`.
2. **`PLAN.md`** at project root — this plan, the long-term implementation reference.

### Supabase config (for CLAUDE.md / `.env.local`)
- Project URL: `https://ynqbbkxfhlrpcwavuhea.supabase.co`
- Project ref: `ynqbbkxfhlrpcwavuhea`
- Publishable (anon) key: `sb_publishable_Ig-_Jmzmiq4og7FYC-9DDQ_EuAhHmPp` (public-safe → CLAUDE.md OK)
- **DB password / connection string: SECRET — NOT written to any committed file.** Goes only in gitignored `.env.local`. **Must be rotated** (it was pasted in chat): Dashboard → Settings → Database → Reset password. Service-role key (if needed for admin server actions) also `.env.local` only.

## Build order
1. Create project `CLAUDE.md` + `PLAN.md`; `.gitignore` with `.env.local`. *(done in planning)*
2. Supabase migration: tables + RLS + scoring views + signup→`profiles` trigger; seed league, both competitions, groups, teams.
3. Scaffold Next.js + Tailwind + `@supabase/supabase-js` + `@supabase/ssr`; env wiring.
4. Auth (magic-link + display name + session middleware).
5. `/predict` — Group Stage ranking UI, lock-aware upsert.
6. `/predict/bracket` — OG Full Run capture: standings → thirds → knockout bracket → champion.
7. `/leaderboard` + `/picks/[userId]` — read views (group scoring live; OG group portion live, knockout accrues later).
8. `/admin` — group results + knockout results entry, lock control; set own `is_admin`.
9. Verify end-to-end; deploy to Vercel.

## Verification
- Two test users predict; confirm picks **hidden** from each other pre-lock.
- Set `locks_at` to the past → predictions read-only + mutually visible.
- Admin enters a group's `final_order` → leaderboard points match the table (test exact, partial, all-4 bonus).
- Mobile viewport check; deploy + sign in on a phone.

## Roadmap (after MVP, during the tournament)
- Finish **OG Full Run** knockout scoring as results come in (capture ships first).
- **3rd-Place Playoff** competition (opens ~June 27).
- **Knockout Bracket** competition with real qualified teams (opens ~June 28) — bracket predictor, wcpredictor-style.
- **QF Bracket** competition.
- Multi-league + invite codes · coins/money/betting layer · auto results via football API · email/push notifications.
