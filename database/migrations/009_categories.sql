-- Migration 009: Platform stream categories.

create table if not exists public.stream_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.stream_categories (slug, name, sort_order)
values
  ('slots', 'Slots', 10),
  ('poker', 'Poker', 20),
  ('fishing', 'Fishing', 30),
  ('arcade', 'Arcade', 40),
  ('baccarat', 'Baccarat', 50),
  ('roulette', 'Roulette', 60),
  ('blackjack', 'Blackjack', 70)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

create index if not exists idx_stream_categories_active_order
  on public.stream_categories (is_active, sort_order, name);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.stream_categories to service_role;
grant select on public.stream_categories to anon, authenticated;

alter table public.stream_categories enable row level security;

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

drop trigger if exists trg_stream_categories_updated_at on public.stream_categories;
create trigger trg_stream_categories_updated_at
  before update on public.stream_categories
  for each row
  execute function update_updated_at();
