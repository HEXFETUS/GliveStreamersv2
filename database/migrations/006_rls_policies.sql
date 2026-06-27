-- Migration 006: RLS policies for GLiveStreamers tables.
-- Run this after 005_public_grants.sql if RLS is enabled in Supabase.

alter table public.users enable row level security;
alter table public.streams enable row level security;
alter table public.stream_categories enable row level security;

drop policy if exists "service_role_users_all" on public.users;
create policy "service_role_users_all"
  on public.users
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_streams_all" on public.streams;
create policy "service_role_streams_all"
  on public.streams
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "anon_can_view_live_streams" on public.streams;
create policy "anon_can_view_live_streams"
  on public.streams
  for select
  to anon
  using (is_live = true);

drop policy if exists "authenticated_can_view_live_streams" on public.streams;
create policy "authenticated_can_view_live_streams"
  on public.streams
  for select
  to authenticated
  using (is_live = true);

drop policy if exists "authenticated_can_manage_own_streams" on public.streams;
create policy "authenticated_can_manage_own_streams"
  on public.streams
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "authenticated_can_view_own_user" on public.users;
create policy "authenticated_can_view_own_user"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "service_role_stream_categories_all" on public.stream_categories;
create policy "service_role_stream_categories_all"
  on public.stream_categories
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "anon_can_view_active_categories" on public.stream_categories;
create policy "anon_can_view_active_categories"
  on public.stream_categories
  for select
  to anon
  using (is_active = true);

drop policy if exists "authenticated_can_view_active_categories" on public.stream_categories;
create policy "authenticated_can_view_active_categories"
  on public.stream_categories
  for select
  to authenticated
  using (is_active = true);
