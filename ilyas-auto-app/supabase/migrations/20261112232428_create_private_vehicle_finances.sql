-- HBR AUTO — Registre financier privé par véhicule.
-- Appliqué sur le projet Supabase le 2026-11-12.
-- Aucun coût ni bénéfice n'est stocké dans le catalogue public.

create table if not exists public.vehicle_finances (
  id uuid primary key default gen_random_uuid(),
  vehicle_id bigint unique references public.vehicles(id) on delete set null,
  vehicle_label text not null,
  purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
  transport_cost numeric(14,2) not null default 0 check (transport_cost >= 0),
  preparation_cost numeric(14,2) not null default 0 check (preparation_cost >= 0),
  other_costs numeric(14,2) not null default 0 check (other_costs >= 0),
  sale_price numeric(14,2) check (sale_price is null or sale_price >= 0),
  purchase_date date,
  sale_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicle_finances enable row level security;

drop policy if exists "admins manage vehicle finances" on public.vehicle_finances;
create policy "admins manage vehicle finances"
on public.vehicle_finances
for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant select, insert, update, delete on public.vehicle_finances to authenticated;
revoke all on public.vehicle_finances from anon, public;
