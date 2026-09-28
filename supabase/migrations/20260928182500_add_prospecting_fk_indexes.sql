-- Índices para as chaves estrangeiras usadas pelo módulo de Prospecção.
create index prospecting_runs_user_id_idx on public.prospecting_runs(user_id);
create index prospects_converted_client_id_idx on public.prospects(converted_client_id);
