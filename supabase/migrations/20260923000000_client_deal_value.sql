-- Synapse — valor da negociação por cliente (2026-09-23)
-- Idempotente e aditivo: clientes existentes ficam com valor 0.
alter table public.clients
  add column if not exists deal_value numeric(14, 2) not null default 0;

alter table public.clients drop constraint if exists clients_deal_value_range;
alter table public.clients
  add constraint clients_deal_value_range
  check (deal_value >= 0 and deal_value <= 999999999999.99) not valid;
alter table public.clients validate constraint clients_deal_value_range;
