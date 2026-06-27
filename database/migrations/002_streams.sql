-- Migration 002: Streams table
-- Run this after 001_users.sql.

create table if not exists public.streams (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  category     text not null default '',
  tags         text[] not null default '{}',
  thumbnail_url text,
  language     text not null default 'en',
  visibility   text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  user_id      uuid not null references public.users(id) on delete cascade,
  livekit_room_name text not null unique default gen_random_uuid()::text,
  status       text not null default 'draft' check (status in ('draft', 'ready', 'starting', 'live', 'ending', 'ended', 'archived')),
  is_live      boolean not null default false,
  viewer_count integer not null default 0,
  peak_viewer_count integer not null default 0,
  duration_seconds integer not null default 0,
  started_at   timestamptz,
  ended_at     timestamptz,
  livekit_room_created_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_streams_user_id on public.streams (user_id);
create index if not exists idx_streams_is_live on public.streams (is_live);
create index if not exists idx_streams_status on public.streams (status);
create index if not exists idx_streams_visibility on public.streams (visibility);
create index if not exists idx_streams_category on public.streams (category);
create index if not exists idx_streams_tags on public.streams using gin (tags);
create unique index if not exists idx_streams_livekit_room_name on public.streams (livekit_room_name);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.streams to service_role;
grant select, insert, update, delete on public.streams to authenticated;
grant select on public.streams to anon;

drop trigger if exists trg_streams_updated_at on public.streams;
create trigger trg_streams_updated_at
  before update on public.streams
  for each row
  execute function update_updated_at();
