# World Cup 2026 Fantasy ⚽

A prediction game to play with friends during the 2026 World Cup. Make one big
prediction for the whole tournament up front, then keep playing through smaller
competitions as the real thing unfolds — group stage, third-place playoff, and
the knockout bracket. Standings and winners only: no scores, no money, no betting.

## Stack
- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind v4**
- **Supabase** — Postgres + Auth (email/password) + Row Level Security
- Deploy on **Vercel**

## Local setup
```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
node scripts/migrate.mjs     # apply DB migrations
npm run dev                  # http://localhost:3000
```

## Database
- Migrations are versioned SQL in `supabase/migrations/`, applied by
  `node scripts/migrate.mjs` (direct Postgres — tracked in `_wcf_migrations`).
- Ad-hoc SQL: `node scripts/sql.mjs "select ..."`.

## Deploy (Vercel)
Set these env vars in the Vercel project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then connect this repo and deploy.

## Project docs
- `PLAN.md` — full design and roadmap.
- `CLAUDE.md` — working notes / architecture for contributors.
