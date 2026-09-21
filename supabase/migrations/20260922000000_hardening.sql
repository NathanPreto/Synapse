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
