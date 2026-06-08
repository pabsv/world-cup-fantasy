-- Helpers, signup trigger, RLS policies, and scoring views.

-- ── Helper functions ────────────────────────────────────────────────────────
create or replace function public.wcf_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;

-- Predictions freeze at kickoff (earliest lock among the up-front competitions).
create or replace function public.wcf_predictions_locked()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select min(locks_at) from public.competitions where type in ('group_standings','og_full')) <= now(),
    false);
$$;

-- ── New-user trigger: create profile + auto-join the global league ───────────
create or replace function public.wcf_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare lg uuid;
begin
  insert into public.profiles (id, display_name, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email = 'pablovegarzv@gmail.com'   -- owner is auto-admin
  )
  on conflict (id) do nothing;

  for lg in select id from public.leagues loop
    insert into public.league_members (league_id, user_id) values (lg, new.id)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

drop trigger if exists wcf_on_auth_user_created on auth.users;
create trigger wcf_on_auth_user_created
  after insert on auth.users
  for each row execute function public.wcf_handle_new_user();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.leagues             enable row level security;
alter table public.league_members      enable row level security;
alter table public.competitions        enable row level security;
alter table public.groups              enable row level security;
alter table public.teams               enable row level security;
alter table public.group_predictions   enable row level security;
alter table public.group_results       enable row level security;
alter table public.bracket_predictions enable row level security;
alter table public.bracket_results     enable row level security;

-- profiles: everyone authed can read; update only your own row
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- reference data: read for authed
drop policy if exists leagues_select on public.leagues;
create policy leagues_select on public.leagues for select to authenticated using (true);
drop policy if exists league_members_select on public.league_members;
create policy league_members_select on public.league_members for select to authenticated using (true);
drop policy if exists competitions_select on public.competitions;
create policy competitions_select on public.competitions for select to authenticated using (true);
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated using (true);
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated using (true);

-- group_predictions: your own anytime; everyone's only AFTER lock
drop policy if exists gp_select on public.group_predictions;
create policy gp_select on public.group_predictions for select to authenticated
  using (user_id = auth.uid() or public.wcf_predictions_locked());
drop policy if exists gp_insert on public.group_predictions;
create policy gp_insert on public.group_predictions for insert to authenticated
  with check (user_id = auth.uid() and not public.wcf_predictions_locked());
drop policy if exists gp_update on public.group_predictions;
create policy gp_update on public.group_predictions for update to authenticated
  using (user_id = auth.uid() and not public.wcf_predictions_locked())
  with check (user_id = auth.uid() and not public.wcf_predictions_locked());

-- group_results: read all; write admin only
drop policy if exists gr_select on public.group_results;
create policy gr_select on public.group_results for select to authenticated using (true);
drop policy if exists gr_write on public.group_results;
create policy gr_write on public.group_results for all to authenticated
  using (public.wcf_is_admin()) with check (public.wcf_is_admin());

-- bracket_predictions: your own anytime; everyone's only AFTER lock
drop policy if exists bp_select on public.bracket_predictions;
create policy bp_select on public.bracket_predictions for select to authenticated
  using (user_id = auth.uid() or public.wcf_predictions_locked());
drop policy if exists bp_insert on public.bracket_predictions;
create policy bp_insert on public.bracket_predictions for insert to authenticated
  with check (user_id = auth.uid() and not public.wcf_predictions_locked());
drop policy if exists bp_update on public.bracket_predictions;
create policy bp_update on public.bracket_predictions for update to authenticated
  using (user_id = auth.uid() and not public.wcf_predictions_locked())
  with check (user_id = auth.uid() and not public.wcf_predictions_locked());

-- bracket_results: read all; write admin only
drop policy if exists brr_select on public.bracket_results;
create policy brr_select on public.bracket_results for select to authenticated using (true);
drop policy if exists brr_write on public.bracket_results;
create policy brr_write on public.bracket_results for all to authenticated
  using (public.wcf_is_admin()) with check (public.wcf_is_admin());

-- ── Scoring views (security_invoker => caller's RLS applies) ─────────────────
-- Per (competition, user, group) points: position hits + all-4 bonus.
create or replace view public.v_group_scores
with (security_invoker = on) as
select
  c.id        as competition_id,
  gp.user_id,
  gp.group_id,
  ( case when gp.predicted_order[1] = gr.final_order[1] then coalesce((c.scoring_config->'group'->'positions'->>'1')::int,0) else 0 end
  + case when gp.predicted_order[2] = gr.final_order[2] then coalesce((c.scoring_config->'group'->'positions'->>'2')::int,0) else 0 end
  + case when gp.predicted_order[3] = gr.final_order[3] then coalesce((c.scoring_config->'group'->'positions'->>'3')::int,0) else 0 end
  + case when gp.predicted_order[4] = gr.final_order[4] then coalesce((c.scoring_config->'group'->'positions'->>'4')::int,0) else 0 end
  + case when gp.predicted_order = gr.final_order        then coalesce((c.scoring_config->'group'->>'perfect_bonus')::int,0) else 0 end
  )::int      as points
from public.competitions c
join public.group_predictions gp on gp.league_id = c.league_id
join public.group_results gr     on gr.group_id  = gp.group_id
where c.type in ('group_standings','og_full');

-- Points per (competition, user). (Bracket/knockout points added later.)
create or replace view public.v_competition_leaderboard
with (security_invoker = on) as
select competition_id, user_id, sum(points)::int as points
from public.v_group_scores
group by competition_id, user_id;

-- Overall per (league, user) = sum across competitions.
create or replace view public.v_league_leaderboard
with (security_invoker = on) as
select c.league_id, cl.user_id, sum(cl.points)::int as points
from public.v_competition_leaderboard cl
join public.competitions c on c.id = cl.competition_id
group by c.league_id, cl.user_id;
