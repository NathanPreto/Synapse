-- ARQUIVO GERADO por `npm run build:schema` — não edite à mão.
-- Edite os arquivos em supabase/migrations/ e gere novamente.
-- Todo o conteúdo é idempotente: pode ser colado inteiro no SQL Editor do Supabase,
-- tanto em um projeto novo quanto em um projeto existente.
-- Nunca coloque service_role/secret key neste arquivo.

-- ===== 20260915000000_initial_schema.sql =====
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

-- ===== 20260922000000_hardening.sql =====
-- Synapse — endurecimento do banco (2026-09-22)
-- Idempotente: pode ser executado mais de uma vez.
--
-- Inclui:
--   1. updated_at automático (trigger);
--   2. resolução de conflito entre dispositivos (última edição vence, por registro);
--   3. restrições de valores (stage, temp, mood, tema, tamanhos);
--   4. consentimento LGPD e metadados do cofre criptografado no perfil;
--   5. colunas para dados criptografados de ponta a ponta (check-ins e diário);
--   6. controle de uso da IA (limite por usuário/minuto/dia e limite global).

-- ---------------------------------------------------------------------------
-- 1. updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_b_updated_at on public.profiles;
create trigger profiles_b_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Conflito entre dispositivos: a edição mais recente de cada registro vence.
--    O cliente envia client_updated_at (momento real da edição, mesmo offline).
--    Uma gravação mais antiga que a já salva é ignorada em silêncio e o
--    cliente recarrega a versão da nuvem.
-- ---------------------------------------------------------------------------
alter table public.clients   add column if not exists client_updated_at timestamptz not null default now();
alter table public.reminders add column if not exists client_updated_at timestamptz not null default now();
alter table public.checkins  add column if not exists client_updated_at timestamptz not null default now();
alter table public.app_settings add column if not exists client_updated_at timestamptz not null default now();

create or replace function public.enforce_last_write_wins()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.client_updated_at < old.client_updated_at then
    return null; -- edição mais antiga: preserva a versão mais nova
  end if;
  return new;
end;
$$;

-- Triggers BEFORE são executados em ordem alfabética: "a_lww" antes de "b_updated_at".
drop trigger if exists clients_a_lww on public.clients;
create trigger clients_a_lww before update on public.clients
  for each row execute function public.enforce_last_write_wins();
drop trigger if exists clients_b_updated_at on public.clients;
create trigger clients_b_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists reminders_a_lww on public.reminders;
create trigger reminders_a_lww before update on public.reminders
  for each row execute function public.enforce_last_write_wins();
drop trigger if exists reminders_b_updated_at on public.reminders;
create trigger reminders_b_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

drop trigger if exists checkins_a_lww on public.checkins;
create trigger checkins_a_lww before update on public.checkins
  for each row execute function public.enforce_last_write_wins();
drop trigger if exists checkins_b_updated_at on public.checkins;
create trigger checkins_b_updated_at before update on public.checkins
  for each row execute function public.set_updated_at();

drop trigger if exists app_settings_a_lww on public.app_settings;
create trigger app_settings_a_lww before update on public.app_settings
  for each row execute function public.enforce_last_write_wins();
drop trigger if exists app_settings_b_updated_at on public.app_settings;
create trigger app_settings_b_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Consentimento (LGPD) e cofre no perfil; colunas criptografadas
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists consent_version text,
  add column if not exists consent_terms_at timestamptz,
  add column if not exists consent_sensitive_at timestamptz,
  add column if not exists consent_ai_at timestamptz,
  add column if not exists vault_salt text,
  add column if not exists vault_verifier text,
  add column if not exists vault_iterations integer;

-- Check-ins: texto sensível vai cifrado em "enc"; "mood" continua em claro.
alter table public.checkins add column if not exists enc text;
-- Diário de desidentificação + frase fixada, cifrados juntos.
alter table public.app_settings add column if not exists private_enc text;

-- ---------------------------------------------------------------------------
-- 4. Restrições de valores.
--    NOT VALID: protege toda nova gravação sem falhar por causa de linhas antigas.
--    Depois tentamos validar; se houver linha antiga fora do padrão, só avisa.
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('clients',   'clients_stage_valid',       $c$check (stage in ('novo','contato','proposta','fechado','perdido'))$c$),
      ('clients',   'clients_temp_valid',        $c$check (temp in ('quente','morno','frio'))$c$),
      ('clients',   'clients_name_len',          $c$check (char_length(name) between 1 and 200)$c$),
      ('clients',   'clients_contact_len',       $c$check (char_length(contact) <= 500)$c$),
      ('clients',   'clients_notes_len',         $c$check (char_length(notes) <= 20000)$c$),
      ('clients',   'clients_lost_reason_len',   $c$check (char_length(lost_reason) <= 20000)$c$),
      ('clients',   'clients_lost_tags_array',   $c$check (jsonb_typeof(lost_tags) = 'array')$c$),
      ('clients',   'clients_id_len',            $c$check (char_length(id) between 1 and 64)$c$),
      ('reminders', 'reminders_text_len',        $c$check (char_length(text) between 1 and 1000)$c$),
      ('reminders', 'reminders_id_len',          $c$check (char_length(id) between 1 and 64)$c$),
      ('checkins',  'checkins_mood_range',       $c$check (mood between 1 and 5)$c$),
      ('checkins',  'checkins_text_len',         $c$check (char_length(identity) <= 20000 and char_length(note) <= 20000 and char_length(reframe) <= 20000)$c$),
      ('checkins',  'checkins_stages_object',    $c$check (jsonb_typeof(mental_stages) = 'object')$c$),
      ('checkins',  'checkins_enc_len',          $c$check (enc is null or char_length(enc) <= 200000)$c$),
      ('checkins',  'checkins_id_len',           $c$check (char_length(id) between 1 and 64)$c$),
      ('app_settings', 'settings_theme_valid',   $c$check (theme in ('dark','light'))$c$),
      ('app_settings', 'settings_entries_array', $c$check (jsonb_typeof(desidentification_entries) = 'array')$c$),
      ('app_settings', 'settings_templates_array', $c$check (jsonb_typeof(templates) = 'array')$c$),
      ('app_settings', 'settings_private_enc_len', $c$check (private_enc is null or char_length(private_enc) <= 500000)$c$),
      ('profiles',  'profiles_vault_len',        $c$check (char_length(coalesce(vault_salt,'')) <= 200 and char_length(coalesce(vault_verifier,'')) <= 2000)$c$)
    ) as t(tbl, name, expr)
  loop
    execute format('alter table public.%I drop constraint if exists %I', c.tbl, c.name);
    execute format('alter table public.%I add constraint %I %s not valid', c.tbl, c.name, c.expr);
    begin
      execute format('alter table public.%I validate constraint %I', c.tbl, c.name);
    exception when check_violation then
      raise notice 'Restrição % criada como NOT VALID: há linhas antigas fora do padrão em %.', c.name, c.tbl;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 5. Controle de uso da IA (a Edge Function usa a service role; o app não acessa)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  subject      text        not null,           -- 'u:<uuid>' ou 'global'
  bucket       text        not null,           -- 'minute' | 'day'
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (subject, bucket, window_start)
);

alter table public.ai_usage enable row level security;
-- Sem policies: nenhum acesso via Data API para anon/authenticated.
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.consume_ai_quota(
  p_user uuid,
  p_per_minute integer,
  p_per_day integer,
  p_global_per_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minute timestamptz := date_trunc('minute', now());
  v_day    timestamptz := date_trunc('day', now());
  v_min integer;
  v_daily integer;
  v_glob integer;
begin
  if p_user is null then
    raise exception 'user required';
  end if;

  insert into public.ai_usage as u (subject, bucket, window_start, count)
  values ('u:' || p_user::text, 'minute', v_minute, 1)
  on conflict (subject, bucket, window_start) do update set count = u.count + 1
  returning u.count into v_min;
  if v_min > p_per_minute then
    return jsonb_build_object('allowed', false, 'reason', 'minute');
  end if;

  insert into public.ai_usage as u (subject, bucket, window_start, count)
  values ('u:' || p_user::text, 'day', v_day, 1)
  on conflict (subject, bucket, window_start) do update set count = u.count + 1
  returning u.count into v_daily;
  if v_daily > p_per_day then
    return jsonb_build_object('allowed', false, 'reason', 'day');
  end if;

  insert into public.ai_usage as u (subject, bucket, window_start, count)
  values ('global', 'day', v_day, 1)
  on conflict (subject, bucket, window_start) do update set count = u.count + 1
  returning u.count into v_glob;
  if v_glob > p_global_per_day then
    return jsonb_build_object('allowed', false, 'reason', 'global');
  end if;

  -- limpeza ocasional de janelas antigas
  if random() < 0.02 then
    delete from public.ai_usage where window_start < now() - interval '3 days';
  end if;

  return jsonb_build_object('allowed', true, 'minute', v_min, 'day', v_daily);
end;
$$;

revoke all on function public.consume_ai_quota(uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, integer, integer, integer) to service_role;

-- ===== 20260923000000_client_deal_value.sql =====
-- Synapse — valor da negociação por cliente (2026-09-23)
-- Idempotente e aditivo: clientes existentes ficam com valor 0.
alter table public.clients
  add column if not exists deal_value numeric(14, 2) not null default 0;

alter table public.clients drop constraint if exists clients_deal_value_range;
alter table public.clients
  add constraint clients_deal_value_range
  check (deal_value >= 0 and deal_value <= 999999999999.99) not valid;
alter table public.clients validate constraint clients_deal_value_range;
