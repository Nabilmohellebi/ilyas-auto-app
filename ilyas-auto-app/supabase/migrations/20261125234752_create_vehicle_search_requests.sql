create table if not exists public.vehicle_search_requests (
  id uuid primary key default gen_random_uuid(),
  nom_client text not null check (length(trim(nom_client)) between 2 and 120),
  telephone text not null check (telephone ~ '^[0-9+() .-]{8,25}$'),
  marque text,
  modele text,
  budget_min numeric(14,2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(14,2) check (budget_max is null or budget_max >= 0),
  annee_min integer check (annee_min is null or annee_min between 1950 and 2100),
  annee_max integer check (annee_max is null or annee_max between 1950 and 2100),
  km_max integer check (km_max is null or km_max >= 0),
  carburant text,
  transmission text,
  notes text not null default '',
  source text not null default 'site' check (source in ('site', 'showroom', 'telephone', 'whatsapp', 'autre')),
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'contactee', 'correspondance', 'cloturee', 'annulee')),
  matched_vehicle_id bigint references public.vehicles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_search_request_vehicle_criteria check (
    nullif(trim(coalesce(marque, '')), '') is not null
    or nullif(trim(coalesce(modele, '')), '') is not null
  ),
  constraint vehicle_search_request_budget_range check (
    budget_min is null or budget_max is null or budget_min <= budget_max
  ),
  constraint vehicle_search_request_year_range check (
    annee_min is null or annee_max is null or annee_min <= annee_max
  )
);

create index if not exists vehicle_search_requests_status_created_idx
  on public.vehicle_search_requests (statut, created_at desc);
create index if not exists vehicle_search_requests_vehicle_idx
  on public.vehicle_search_requests (matched_vehicle_id)
  where matched_vehicle_id is not null;

alter table public.vehicle_search_requests enable row level security;

drop policy if exists "public insert vehicle search requests" on public.vehicle_search_requests;
drop policy if exists "admins manage vehicle search requests" on public.vehicle_search_requests;

create policy "public insert vehicle search requests"
on public.vehicle_search_requests
for insert
to anon, authenticated
with check (
  source = 'site'
  and statut = 'nouvelle'
  and matched_vehicle_id is null
);

create policy "admins manage vehicle search requests"
on public.vehicle_search_requests
for all
to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.vehicle_search_requests to anon, authenticated;
