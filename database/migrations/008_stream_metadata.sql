-- Migration 008: Platform stream metadata fields.

alter table public.streams
  add column if not exists description text not null default '',
  add column if not exists category text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists thumbnail_url text,
  add column if not exists language text not null default 'en',
  add column if not exists visibility text not null default 'public';

update public.streams
set
  description = coalesce(description, ''),
  category = coalesce(category, ''),
  tags = coalesce(tags, '{}'),
  language = coalesce(language, 'en'),
  visibility = case
    when visibility in ('public', 'unlisted', 'private') then visibility
    else 'public'
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'streams_visibility_check'
  ) then
    alter table public.streams
      add constraint streams_visibility_check
      check (visibility in ('public', 'unlisted', 'private'));
  end if;
end $$;

create index if not exists idx_streams_visibility on public.streams (visibility);
create index if not exists idx_streams_category on public.streams (category);
create index if not exists idx_streams_tags on public.streams using gin (tags);
