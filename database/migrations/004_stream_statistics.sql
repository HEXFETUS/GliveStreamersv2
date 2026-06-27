-- Migration 004: Stream statistics and analytics fields.
-- Run this after 003_livekit_rooms.sql.

alter table public.streams
  add column if not exists status text not null default 'draft',
  add column if not exists peak_viewer_count integer not null default 0,
  add column if not exists duration_seconds integer not null default 0;

update public.streams
set status = case
  when is_live then 'live'
  when ended_at is not null then 'ended'
  when status = 'idle' then 'draft'
  else status
end
where status is null or status not in ('draft', 'ready', 'starting', 'live', 'ending', 'ended', 'archived');

update public.streams
set peak_viewer_count = greatest(peak_viewer_count, viewer_count);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'streams_status_check'
  ) then
    alter table public.streams
      add constraint streams_status_check
      check (status in ('draft', 'ready', 'starting', 'live', 'ending', 'ended', 'archived'));
  end if;
end $$;

create index if not exists idx_streams_status on public.streams (status);
