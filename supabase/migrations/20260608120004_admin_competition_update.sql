-- Allow admins to edit competitions (e.g. set/adjust locks_at, status).
drop policy if exists competitions_admin_update on public.competitions;
create policy competitions_admin_update on public.competitions for update to authenticated
  using (public.wcf_is_admin()) with check (public.wcf_is_admin());
