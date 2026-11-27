alter table public.sell_requests
  add column if not exists status_updated_at timestamptz;

update public.sell_requests
set status_updated_at = coalesce(created_at, now())
where status_updated_at is null;

alter table public.sell_requests
  alter column status_updated_at set default now(),
  alter column status_updated_at set not null;

create or replace function public.set_sell_request_status_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.statut is distinct from old.statut then
    new.status_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists sell_requests_status_updated_at on public.sell_requests;
create trigger sell_requests_status_updated_at
before update of statut on public.sell_requests
for each row
execute function public.set_sell_request_status_updated_at();

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
stable
security definer
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

  select exists (
    select 1
    from public.reservations r
    where upper(r.id) = v_reference
      and regexp_replace(coalesce(r.telephone, ''), '[^0-9]', '', 'g') = v_phone
    union all
    select 1
    from public.sell_requests s
    where upper(s.id) = v_reference
      and regexp_replace(coalesce(s.telephone, ''), '[^0-9]', '', 'g') = v_phone
  )
  into v_authorized;

  if not v_authorized then
    return;
  end if;

  return query
  select
    dossier.request_type,
    dossier.reference,
    dossier.label,
    dossier.amount,
    dossier.statut,
    dossier.created_at,
    dossier.updated_at
  from (
    select
      'reservation'::text as request_type,
      r.id as reference,
      r.vehicule_nom as label,
      r.vehicule_prix as amount,
      r.statut,
      r.created_at,
      coalesce(r.status_updated_at, r.created_at) as updated_at
    from public.reservations r
    where regexp_replace(coalesce(r.telephone, ''), '[^0-9]', '', 'g') = v_phone

    union all

    select
      'sell_request'::text as request_type,
      s.id as reference,
      s.marque || ' ' || s.modele
        || case when s.annee is not null then ' (' || s.annee::text || ')' else '' end as label,
      s.prix_souhaite as amount,
      s.statut,
      s.created_at,
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
