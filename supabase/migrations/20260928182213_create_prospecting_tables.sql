-- Prospecção: estrutura inicial para pesquisa, análise e contatos.
-- Segmentos iniciais: Plásticos, Alimentos, Química, Papel e celulose, Tratamento de água.

create table public.prospecting_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Nova prospecção' check (char_length(name) between 1 and 200),
  product text not null default 'Soprador radial' check (char_length(product) between 1 and 200),
  region text not null default '' check (char_length(region) <= 200),
  segments jsonb not null default '["Plásticos","Alimentos","Química","Papel e celulose","Tratamento de água"]'::jsonb check (jsonb_typeof(segments) = 'array'),
  keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(keywords) = 'array'),
  requested_limit integer not null default 20 check (requested_limit between 1 and 100),
  status text not null default 'draft' check (status = any (array['draft','running','completed','failed','cancelled'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.prospecting_runs(id) on delete set null,
  company_name text not null check (char_length(company_name) between 1 and 200),
  trade_name text not null default '' check (char_length(trade_name) <= 200),
  domain text not null default '' check (char_length(domain) <= 500),
  website text not null default '' check (char_length(website) <= 1000),
  industry text not null default '' check (char_length(industry) <= 200),
  description text not null default '' check (char_length(description) <= 5000),
  city text not null default '' check (char_length(city) <= 120),
  state text not null default '' check (char_length(state) <= 120),
  country text not null default 'Brasil' check (char_length(country) <= 120),
  potential text not null default 'unknown' check (potential = any (array['unknown','low','medium','high'])),
  potential_reason text not null default '' check (char_length(potential_reason) <= 10000),
  analysis_status text not null default 'pending' check (analysis_status = any (array['pending','analyzing','analyzed','failed'])),
  analysis jsonb not null default '{}'::jsonb check (jsonb_typeof(analysis) = 'object'),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  unknowns jsonb not null default '[]'::jsonb check (jsonb_typeof(unknowns) = 'array'),
  status text not null default 'new' check (status = any (array['new','qualified','discarded','converted'])),
  converted_client_id text references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospect_contacts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 200),
  email text not null default '' check (char_length(email) <= 320),
  phone text not null default '' check (char_length(phone) <= 80),
  job_title text not null default '' check (char_length(job_title) <= 200),
  department text not null default '' check (char_length(department) <= 200),
  email_status text not null default 'unknown' check (email_status = any (array['unknown','valid','invalid','risky'])),
  email_confidence text not null default 'unknown' check (email_confidence = any (array['unknown','low','medium','high'])),
  source text not null default '' check (char_length(source) <= 100),
  source_url text not null default '' check (char_length(source_url) <= 1000),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospect_sources (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type = any (array['website','search','email_provider','other'])),
  source_name text not null default '' check (char_length(source_name) <= 200),
  source_url text not null default '' check (char_length(source_url) <= 1000),
  evidence text not null default '' check (char_length(evidence) <= 5000),
  captured_at timestamptz not null default now()
);

alter table public.prospecting_runs enable row level security;
alter table public.prospects enable row level security;
alter table public.prospect_contacts enable row level security;
alter table public.prospect_sources enable row level security;

create policy "Users can select their prospecting runs" on public.prospecting_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their prospecting runs" on public.prospecting_runs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their prospecting runs" on public.prospecting_runs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their prospecting runs" on public.prospecting_runs for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their prospects" on public.prospects for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their prospects" on public.prospects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their prospects" on public.prospects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their prospects" on public.prospects for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their prospect contacts" on public.prospect_contacts for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their prospect contacts" on public.prospect_contacts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their prospect contacts" on public.prospect_contacts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their prospect contacts" on public.prospect_contacts for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their prospect sources" on public.prospect_sources for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their prospect sources" on public.prospect_sources for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their prospect sources" on public.prospect_sources for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their prospect sources" on public.prospect_sources for delete to authenticated using ((select auth.uid()) = user_id);

create index prospects_user_id_idx on public.prospects(user_id);
create index prospects_run_id_idx on public.prospects(run_id);
create index prospects_domain_idx on public.prospects(user_id, domain);
create index prospect_contacts_prospect_id_idx on public.prospect_contacts(prospect_id);
create index prospect_contacts_user_id_idx on public.prospect_contacts(user_id);
create index prospect_sources_prospect_id_idx on public.prospect_sources(prospect_id);
create index prospect_sources_user_id_idx on public.prospect_sources(user_id);
