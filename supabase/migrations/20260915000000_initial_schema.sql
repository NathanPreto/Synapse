-- Synapse V5 - banco inicial
-- Execute este arquivo no Supabase > SQL Editor > New query.
-- Não coloque nenhuma service_role/secret key neste arquivo.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact text not null default '',
  stage text not null default 'novo',
  temp text not null default 'morno',
  last_contact date,
  created_at_date date,
  notes text not null default '',
  lost_reason text not null default '',
  lost_tags jsonb not null default '[]'::jsonb,
  closed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  due date,
  client_id text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood integer not null default 3,
  identity text not null default '',
  note text not null default '',
  reframe text not null default '',
  mental_stages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  desidentification_entries jsonb not null default '[]'::jsonb,
  pinned_phrase jsonb,
  templates jsonb not null default '[]'::jsonb,
  theme text not null default 'dark',
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_user_stage_idx on public.clients(user_id, stage);
create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists reminders_user_due_idx on public.reminders(user_id, due);
create index if not exists checkins_user_id_idx on public.checkins(user_id);
create index if not exists checkins_user_date_idx on public.checkins(user_id, date);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.reminders enable row level security;
alter table public.checkins enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;
drop policy if exists "reminders_select_own" on public.reminders;
drop policy if exists "reminders_insert_own" on public.reminders;
drop policy if exists "reminders_update_own" on public.reminders;
drop policy if exists "reminders_delete_own" on public.reminders;
drop policy if exists "checkins_select_own" on public.checkins;
drop policy if exists "checkins_insert_own" on public.checkins;
drop policy if exists "checkins_update_own" on public.checkins;
drop policy if exists "checkins_delete_own" on public.checkins;
drop policy if exists "settings_select_own" on public.app_settings;
drop policy if exists "settings_insert_own" on public.app_settings;
drop policy if exists "settings_update_own" on public.app_settings;
drop policy if exists "settings_delete_own" on public.app_settings;

create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "clients_select_own" on public.clients for select to authenticated using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients for insert to authenticated with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients for delete to authenticated using (auth.uid() = user_id);

create policy "reminders_select_own" on public.reminders for select to authenticated using (auth.uid() = user_id);
create policy "reminders_insert_own" on public.reminders for insert to authenticated with check (auth.uid() = user_id);
create policy "reminders_update_own" on public.reminders for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_delete_own" on public.reminders for delete to authenticated using (auth.uid() = user_id);

create policy "checkins_select_own" on public.checkins for select to authenticated using (auth.uid() = user_id);
create policy "checkins_insert_own" on public.checkins for insert to authenticated with check (auth.uid() = user_id);
create policy "checkins_update_own" on public.checkins for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "checkins_delete_own" on public.checkins for delete to authenticated using (auth.uid() = user_id);

create policy "settings_select_own" on public.app_settings for select to authenticated using (auth.uid() = user_id);
create policy "settings_insert_own" on public.app_settings for insert to authenticated with check (auth.uid() = user_id and id = auth.uid());
create policy "settings_update_own" on public.app_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and id = auth.uid());
create policy "settings_delete_own" on public.app_settings for delete to authenticated using (auth.uid() = user_id);

-- Permissões mínimas para o Data API / roles usadas pelo frontend.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select, insert, update, delete on public.checkins to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set full_name = excluded.full_name, updated_at = now();
  insert into public.app_settings (id, user_id)
  values (new.id, new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Recomendação: deixe a confirmação de e-mail ligada durante os testes.
-- Em Authentication > URL Configuration, depois do primeiro deploy,
-- cadastre o domínio da Vercel como Site URL / Redirect URL.
