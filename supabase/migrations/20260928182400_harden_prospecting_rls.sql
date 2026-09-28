-- Reforça o isolamento entre prospects, contatos e fontes do mesmo usuário.
drop policy if exists "Users can insert their prospect contacts" on public.prospect_contacts;
create policy "Users can insert their prospect contacts"
on public.prospect_contacts for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects p
    where p.id = prospect_id and p.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update their prospect contacts" on public.prospect_contacts;
create policy "Users can update their prospect contacts"
on public.prospect_contacts for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects p
    where p.id = prospect_id and p.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects p
    where p.id = prospect_id and p.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can insert their prospect sources" on public.prospect_sources;
create policy "Users can insert their prospect sources"
on public.prospect_sources for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects p
    where p.id = prospect_id and p.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update their prospect sources" on public.prospect_sources;
create policy "Users can update their prospect sources"
on public.prospect_sources for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects p
    where p.id = prospect_id and p.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects p
    where p.id = prospect_id and p.user_id = (select auth.uid())
  )
);