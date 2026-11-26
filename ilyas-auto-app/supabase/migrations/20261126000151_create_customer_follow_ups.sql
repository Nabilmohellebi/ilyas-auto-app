create table if not exists public.customer_follow_ups (
  id uuid primary key default gen_random_uuid(),
  nom_client text not null check (length(trim(nom_client)) between 2 and 120),
  telephone text not null check (telephone ~ '^[0-9+() .-]{8,25}$'),
  objet text not null check (length(trim(objet)) between 2 and 180),
  notes text not null default '',
  due_at timestamptz not null,
  statut text not null default 'a_faire' check (statut in ('a_faire', 'terminee', 'annulee')),
  source text not null default 'autre' check (source in ('reservation', 'reprise', 'recherche', 'crm', 'showroom', 'autre')),
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists customer_follow_ups_due_idx
  on public.customer_follow_ups (due_at asc)
  where statut = 'a_faire';

create index if not exists customer_follow_ups_phone_idx
  on public.customer_follow_ups (telephone, created_at desc);

alter table public.customer_follow_ups enable row level security;

drop policy if exists "admins manage customer follow ups" on public.customer_follow_ups;
create policy "admins manage customer follow ups"
on public.customer_follow_ups
for all
to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.customer_follow_ups to anon, authenticated;
