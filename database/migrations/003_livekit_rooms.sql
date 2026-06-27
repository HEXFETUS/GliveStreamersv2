-- Migration 003: LiveKit room metadata for streams.
-- Run this after 002_streams.sql.

alter table public.streams
  add column if not exists livekit_room_name text,
  add column if not exists livekit_room_created_at timestamptz;

update public.streams
set livekit_room_name = id::text
where livekit_room_name is null;

alter table public.streams
  alter column livekit_room_name set not null;

create unique index if not exists idx_streams_livekit_room_name
  on public.streams (livekit_room_name);
