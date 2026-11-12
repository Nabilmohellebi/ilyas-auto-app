-- ═══════════════════════════════════════════════════════════════
-- HBR AUTO — Schéma Supabase
-- Tables, accès publics limités et accès admin via Supabase Auth.
--
-- IMPORTANT :
-- 1. Créer le compte propriétaire dans Supabase Auth.
-- 2. Définir auth.users.raw_app_meta_data.role = 'admin' pour ce compte.
-- 3. Ne jamais attribuer le rôle depuis raw_user_meta_data / user_metadata.
-- ═══════════════════════════════════════════════════════════════

-- ── STOCK ───────────────────────────────────────────────────────
create table if not exists public.vehicles (
  id bigserial primary key,
  marque text not null,
  modele text not null,
  annee integer not null,
  prix numeric not null,
  prix_old numeric,
  km integer default 0,
  etat_vehicule text not null default 'neuf' check (etat_vehicule in ('neuf', 'occasion')),
  transmission text default 'Automatique',
  carburant text default 'Diesel',
  provenance text default 'france',
  badge text,
  statut text not null default 'disponible',
  description text,
  specs jsonb default '[]',
  images jsonb default '[]',
  images_gallery jsonb default '[]',
  video_url text,
  img text,
  carrosserie text,
  display_order integer default 99,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.vehicles add column if not exists images_gallery jsonb default '[]';
alter table public.vehicles add column if not exists video_url text;
alter table public.vehicles add column if not exists carrosserie text;
alter table public.vehicles add column if not exists etat_vehicule text not null default 'neuf'
  check (etat_vehicule in ('neuf', 'occasion'));

-- ── RESERVATIONS ────────────────────────────────────────────────
create table if not exists public.reservations (
  id text primary key,
  vehicle_id bigint references public.vehicles(id) on delete set null,
  vehicule_nom text not null,
  vehicule_prix numeric not null default 0,
  nom_client text not null,
  telephone text not null,
  message text,
  statut text not null default 'nouvelle',
  date_souhaitee text,
  created_at timestamptz default now()
);
alter table public.reservations add column if not exists date_souhaitee text;

-- ── PROPOSITIONS D'ACHAT / VENTE / ECHANGE ───────────────────────
create table if not exists public.sell_requests (
  id text primary key,
  marque text not null,
  modele text not null,
  annee integer,
  km integer,
  prix_souhaite numeric,
  nom_client text not null,
  telephone text not null,
  message text,
  statut text not null default 'nouvelle',
  created_at timestamptz default now()
);

-- ── PARAMETRES DU SHOWROOM ──────────────────────────────────────
create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- ── BANNIERE ────────────────────────────────────────────────────
create table if not exists public.banner_messages (
  id bigserial primary key,
  message text not null,
  actif boolean default true,
  position integer default 1,
  created_at timestamptz default now()
);

-- ── TEMOIGNAGES ─────────────────────────────────────────────────
create table if not exists public.testimonials (
  id bigserial primary key,
  nom text not null,
  role text,
  photo_url text,
  texte text not null,
  note integer default 5,
  actif boolean default true,
  position integer default 1,
  created_at timestamptz default now()
);

-- ── REGISTRE FINANCIER PRIVE ────────────────────────────────────
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

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────
alter table public.vehicles enable row level security;
alter table public.reservations enable row level security;
alter table public.sell_requests enable row level security;
alter table public.settings enable row level security;
alter table public.banner_messages enable row level security;
alter table public.testimonials enable row level security;
alter table public.vehicle_finances enable row level security;

-- STOCK : visiteurs = lecture du stock actif ; admin = gestion complète.
drop policy if exists "read active vehicles" on public.vehicles;
drop policy if exists "manage vehicles" on public.vehicles;
drop policy if exists "public read active vehicles" on public.vehicles;
drop policy if exists "admins manage vehicles" on public.vehicles;
create policy "public read active vehicles"
on public.vehicles for select to anon, authenticated
using (is_active = true);
create policy "admins manage vehicles"
on public.vehicles for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
grant select on public.vehicles to anon, authenticated;
grant insert, update, delete on public.vehicles to authenticated;

-- RESERVATIONS : création publique uniquement ; lecture et gestion admin.
drop policy if exists "insert reservations" on public.reservations;
drop policy if exists "manage reservations" on public.reservations;
drop policy if exists "public insert reservations" on public.reservations;
drop policy if exists "admins manage reservations" on public.reservations;
create policy "public insert reservations"
on public.reservations for insert to anon, authenticated
with check (true);
create policy "admins manage reservations"
on public.reservations for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
grant insert on public.reservations to anon, authenticated;
grant select, update, delete on public.reservations to authenticated;

-- DEMANDES CLIENTS : création publique uniquement ; données privées admin.
drop policy if exists "insert sell requests" on public.sell_requests;
drop policy if exists "manage sell requests" on public.sell_requests;
drop policy if exists "public insert sell requests" on public.sell_requests;
drop policy if exists "admins manage sell requests" on public.sell_requests;
create policy "public insert sell requests"
on public.sell_requests for insert to anon, authenticated
with check (true);
create policy "admins manage sell requests"
on public.sell_requests for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
grant insert on public.sell_requests to anon, authenticated;
grant select, update, delete on public.sell_requests to authenticated;

-- PARAMETRES : liste blanche publique uniquement ; l'admin gère toutes les clés.
drop policy if exists "read settings" on public.settings;
drop policy if exists "manage settings" on public.settings;
drop policy if exists "public read safe settings" on public.settings;
drop policy if exists "admins manage settings" on public.settings;
create policy "public read safe settings"
on public.settings for select to anon, authenticated
using (key = any (array[
  'shop_name', 'shop_phone', 'shop_whatsapp', 'shop_email', 'shop_address',
  'shop_horaires', 'shop_maps_url', 'shop_maps_embed', 'shop_phones',
  'maintenance', 'trade_margin_percent'
]));
create policy "admins manage settings"
on public.settings for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;

-- BANNIERE : seuls les messages actifs sont publics.
drop policy if exists "read banner" on public.banner_messages;
drop policy if exists "manage banner" on public.banner_messages;
drop policy if exists "public read active banner" on public.banner_messages;
drop policy if exists "admins manage banner" on public.banner_messages;
create policy "public read active banner"
on public.banner_messages for select to anon, authenticated
using (actif = true);
create policy "admins manage banner"
on public.banner_messages for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
grant select on public.banner_messages to anon, authenticated;
grant insert, update, delete on public.banner_messages to authenticated;

-- TEMOIGNAGES : seuls les témoignages actifs sont publics.
drop policy if exists "read testimonials" on public.testimonials;
drop policy if exists "manage testimonials" on public.testimonials;
drop policy if exists "public read active testimonials" on public.testimonials;
drop policy if exists "admins manage testimonials" on public.testimonials;
create policy "public read active testimonials"
on public.testimonials for select to anon, authenticated
using (actif = true);
create policy "admins manage testimonials"
on public.testimonials for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

-- FINANCES : jamais publiques.
drop policy if exists "admins manage vehicle finances" on public.vehicle_finances;
create policy "admins manage vehicle finances"
on public.vehicle_finances for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
grant select, insert, update, delete on public.vehicle_finances to authenticated;
revoke all on public.vehicle_finances from anon, public;

-- ── STOCKAGE PHOTO ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict do nothing;

drop policy if exists "public read vehicle images" on storage.objects;
drop policy if exists "upload vehicle images" on storage.objects;
drop policy if exists "update vehicle images" on storage.objects;
drop policy if exists "delete vehicle images" on storage.objects;
drop policy if exists "admins manage vehicle images" on storage.objects;

create policy "public read vehicle images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'vehicle-images');
create policy "admins manage vehicle images"
on storage.objects for all to authenticated
using (
  bucket_id = 'vehicle-images'
  and (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
)
with check (
  bucket_id = 'vehicle-images'
  and (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
);
