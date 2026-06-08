-- World Cup 2026 Fantasy — core schema.
-- Tables live in `public` of the dedicated WCF project (ynqbbkxfhlrpcwavuhea).

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.leagues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid references public.leagues(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete cascade,
  role      text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists public.competitions (
  id             uuid primary key default gen_random_uuid(),
  league_id      uuid not null references public.leagues(id) on delete cascade,
  type           text not null check (type in ('og_full','group_standings','third_place','knockout_bracket','qf_bracket')),
  title          text not null,
  subtitle       text,
  opens_at       timestamptz,
  locks_at       timestamptz not null,
  status         text not null default 'open' check (status in ('upcoming','open','locked','scored')),
  scoring_config jsonb not null default '{}'::jsonb,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  unique (league_id, type)
);

create table if not exists public.groups (
  id   text primary key,            -- 'A'..'L'
  name text not null
);

create table if not exists public.teams (
  id        uuid primary key default gen_random_uuid(),
  group_id  text not null references public.groups(id),
  name      text not null unique,
  flag_code text not null,          -- flagcdn slug, lowercase (e.g. 'mx', 'gb-eng')
  seed      smallint not null       -- official draw position 1..4 (default display order)
);

-- A user's single group-stage forecast for a league. Shared by Group Stage + OG Full Run.
create table if not exists public.group_predictions (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references public.leagues(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  group_id        text not null references public.groups(id),
  predicted_order uuid[] not null,  -- 4 team ids in predicted finish order
  updated_at      timestamptz not null default now(),
  unique (league_id, user_id, group_id)
);

-- Real-world final group standings. Single source of truth, decoupled from competition.
create table if not exists public.group_results (
  group_id    text primary key references public.groups(id),
  final_order uuid[] not null,
  entered_by  uuid references public.profiles(id) on delete set null,
  entered_at  timestamptz not null default now()
);

-- OG Full Run extra capture: qualifying thirds + full knockout bracket + champion.
create table if not exists public.bracket_predictions (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  payload        jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  unique (competition_id, user_id)
);

-- Real knockout results, entered per round/slot. Global truth (decoupled from competition).
create table if not exists public.bracket_results (
  round      text not null,         -- 'R32','R16','QF','SF','final','champion'
  slot       text not null,         -- bracket slot id from the code constant
  team_id    uuid references public.teams(id),
  entered_by uuid references public.profiles(id) on delete set null,
  entered_at timestamptz not null default now(),
  primary key (round, slot)
);

create index if not exists idx_group_predictions_user on public.group_predictions(league_id, user_id);
create index if not exists idx_bracket_predictions_comp on public.bracket_predictions(competition_id);
