-- Migration 010: Viewer sessions for stream analytics.

create table if not exists public.stream_viewer_sessions (
  id               uuid primary key default gen_random_uuid(),
  stream_id        uuid not null references public.streams(id) on delete cascade,
  viewer_key       text not null,
  joined_at        timestamptz not null default now(),
  left_at          timestamptz,
  duration_seconds integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_stream_viewer_sessions_stream_id
  on public.stream_viewer_sessions (stream_id);

create index if not exists idx_stream_viewer_sessions_viewer_key
  on public.stream_viewer_sessions (stream_id, viewer_key);

create index if not exists idx_stream_viewer_sessions_active
  on public.stream_viewer_sessions (stream_id)
  where left_at is null;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.stream_viewer_sessions to service_role;
grant select, insert, update on public.stream_viewer_sessions to anon, authenticated;

alter table public.stream_viewer_sessions enable row level security;

drop policy if exists "service_role_stream_viewer_sessions_all" on public.stream_viewer_sessions;
create policy "service_role_stream_viewer_sessions_all"
  on public.stream_viewer_sessions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "anon_can_create_stream_viewer_sessions" on public.stream_viewer_sessions;
create policy "anon_can_create_stream_viewer_sessions"
  on public.stream_viewer_sessions
  for insert
  to anon
  with check (true);

drop policy if exists "anon_can_update_stream_viewer_sessions" on public.stream_viewer_sessions;
create policy "anon_can_update_stream_viewer_sessions"
  on public.stream_viewer_sessions
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "anon_can_view_stream_viewer_sessions" on public.stream_viewer_sessions;
create policy "anon_can_view_stream_viewer_sessions"
  on public.stream_viewer_sessions
  for select
  to anon
  using (true);

drop policy if exists "authenticated_can_use_stream_viewer_sessions" on public.stream_viewer_sessions;
create policy "authenticated_can_use_stream_viewer_sessions"
  on public.stream_viewer_sessions
  for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists trg_stream_viewer_sessions_updated_at on public.stream_viewer_sessions;
create trigger trg_stream_viewer_sessions_updated_at
  before update on public.stream_viewer_sessions
  for each row
  execute function update_updated_at();
