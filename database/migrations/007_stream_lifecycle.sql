-- Migration 007: Platform v2 stream lifecycle states.
-- Replaces the legacy idle/live/ended status set with:
-- draft -> ready -> starting -> live -> ending -> ended -> archived

alter table public.streams
  alter column status set default 'draft';

update public.streams
set status = case
  when status = 'idle' then 'draft'
  when is_live then 'live'
  when ended_at is not null then 'ended'
  when status in ('draft', 'ready', 'starting', 'live', 'ending', 'ended', 'archived') then status
  else 'draft'
end;

alter table public.streams
  drop constraint if exists streams_status_check;

alter table public.streams
  add constraint streams_status_check
  check (status in ('draft', 'ready', 'starting', 'live', 'ending', 'ended', 'archived'));
