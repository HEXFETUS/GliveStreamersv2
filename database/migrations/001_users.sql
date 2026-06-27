-- Migration 001: Users table
-- Run this in Supabase SQL Editor or via migration tooling.

create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  password_hash text not null,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for email lookups during login
create index if not exists idx_users_email on public.users (email);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.users to service_role;
grant select, insert, update, delete on public.users to authenticated;
grant select on public.users to anon;

-- Trigger to auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row
  execute function update_updated_at();
