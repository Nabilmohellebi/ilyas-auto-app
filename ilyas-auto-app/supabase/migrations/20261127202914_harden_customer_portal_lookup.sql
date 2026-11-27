drop policy if exists "customer portal scoped read reservations" on public.reservations;
create policy "customer portal scoped read reservations"
on public.reservations
for select
to anon, authenticated
using (
  nullif(current_setting('app.customer_portal_phone', true), '') is not null
  and regexp_replace(coalesce(telephone, ''), '[^0-9]', '', 'g')
      = current_setting('app.customer_portal_phone', true)
);

drop policy if exists "customer portal scoped read sell requests" on public.sell_requests;
create policy "customer portal scoped read sell requests"
on public.sell_requests
for select
to anon, authenticated
using (
  nullif(current_setting('app.customer_portal_phone', true), '') is not null
  and regexp_replace(coalesce(telephone, ''), '[^0-9]', '', 'g')
      = current_setting('app.customer_portal_phone', true)
);

create or replace function public.customer_portal_lookup(
  p_reference text,
  p_phone text
)
returns table (
  request_type text,
  reference text,
  label text,
  amount numeric,
  statut text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_reference text;
  v_phone text;
  v_authorized boolean;
begin
  v_reference := upper(btrim(coalesce(p_reference, '')));
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  if char_length(v_reference) not between 8 and 40
    or char_length(v_phone) not between 8 and 15 then
    return;
  end if;

  -- This transaction-local setting is visible only to RLS checks during this RPC.
  perform pg_catalog.set_config('app.customer_portal_phone', v_phone, true);

  select exists (
    select 1 from public.reservations r
    where upper(r.id) = v_reference
      and regexp_replace(coalesce(r.telephone, ''), '[^0-9]', '', 'g') = v_phone
    union all
    select 1 from public.sell_requests s
    where upper(s.id) = v_reference
      and regexp_replace(coalesce(s.telephone, ''), '[^0-9]', '', 'g') = v_phone
  ) into v_authorized;

  if not v_authorized then return; end if;

  return query
  select dossier.request_type, dossier.reference, dossier.label,
         dossier.amount, dossier.statut, dossier.created_at, dossier.updated_at
  from (
    select 'reservation'::text as request_type, r.id as reference,
           r.vehicule_nom as label, r.vehicule_prix as amount, r.statut,
           r.created_at, coalesce(r.status_updated_at, r.created_at) as updated_at
    from public.reservations r
    where regexp_replace(coalesce(r.telephone, ''), '[^0-9]', '', 'g') = v_phone
    union all
    select 'sell_request'::text as request_type, s.id as reference,
           s.marque || ' ' || s.modele
             || case when s.annee is not null then ' (' || s.annee::text || ')' else '' end as label,
           s.prix_souhaite as amount, s.statut, s.created_at,
           coalesce(s.status_updated_at, s.created_at) as updated_at
    from public.sell_requests s
    where regexp_replace(coalesce(s.telephone, ''), '[^0-9]', '', 'g') = v_phone
  ) as dossier
  order by dossier.created_at desc;
end;
$$;

revoke all on function public.customer_portal_lookup(text, text) from public;
revoke all on function public.customer_portal_lookup(text, text) from anon, authenticated;
grant execute on function public.customer_portal_lookup(text, text) to anon, authenticated;
