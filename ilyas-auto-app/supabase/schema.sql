-- ══════════════════════════════════════════════════════════
-- HBR AUTO — Schéma Supabase complet
-- Coller dans : Supabase → SQL Editor → Run
-- (sans risque de le relancer plusieurs fois : "if not exists" partout)
-- ══════════════════════════════════════════════════════════

-- ── Table Vehicles ────────────────────────────────────────
create table if not exists public.vehicles (
  id            bigserial primary key,
  marque        text not null,
  modele        text not null,
  annee         integer not null,
  prix          numeric not null,
  prix_old      numeric,
  km            integer default 0,
  transmission  text default 'Automatique',
  carburant     text default 'Diesel',
  provenance    text default 'france',
  badge         text,
  statut        text not null default 'disponible',
  description   text,
  specs         jsonb default '[]',
  images        jsonb default '[]',
  images_gallery jsonb default '[]',
  video_url     text,
  img           text,
  display_order integer default 99,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

alter table public.vehicles add column if not exists images_gallery jsonb default '[]';
alter table public.vehicles add column if not exists video_url text;

-- ── Table Reservations ────────────────────────────────────
create table if not exists public.reservations (
  id             text primary key,
  vehicle_id     bigint references public.vehicles(id) on delete set null,
  vehicule_nom   text not null,
  vehicule_prix  numeric not null default 0,
  nom_client     text not null,
  telephone      text not null,
  message        text,
  statut         text not null default 'nouvelle',
  created_at     timestamptz default now()
);

-- ── Table Settings ────────────────────────────────────────
create table if not exists public.settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- ── Table Banner messages ─────────────────────────────────
create table if not exists public.banner_messages (
  id bigserial primary key,
  message text not null,
  actif boolean default true,
  position integer default 1,
  created_at timestamptz default now()
);

-- ── RLS ───────────────────────────────────────────────────
alter table public.vehicles         enable row level security;
alter table public.reservations     enable row level security;
alter table public.settings         enable row level security;
alter table public.banner_messages  enable row level security;

drop policy if exists "read active vehicles" on public.vehicles;
create policy "read active vehicles" on public.vehicles for select using (is_active = true);

drop policy if exists "manage vehicles" on public.vehicles;
create policy "manage vehicles" on public.vehicles for all using (true) with check (true);

drop policy if exists "insert reservations" on public.reservations;
create policy "insert reservations" on public.reservations for insert with check (true);

drop policy if exists "manage reservations" on public.reservations;
create policy "manage reservations" on public.reservations for all using (true) with check (true);

drop policy if exists "read settings" on public.settings;
create policy "read settings" on public.settings for select using (true);

drop policy if exists "manage settings" on public.settings;
create policy "manage settings" on public.settings for all using (true) with check (true);

drop policy if exists "read banner" on public.banner_messages;
create policy "read banner" on public.banner_messages for select using (true);

drop policy if exists "manage banner" on public.banner_messages;
create policy "manage banner" on public.banner_messages for all using (true) with check (true);

-- ── Storage bucket vehicle-images ─────────────────────────
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict do nothing;

drop policy if exists "public read vehicle images" on storage.objects;
create policy "public read vehicle images" on storage.objects for select using (bucket_id = 'vehicle-images');

drop policy if exists "upload vehicle images" on storage.objects;
create policy "upload vehicle images" on storage.objects for insert with check (bucket_id = 'vehicle-images');

drop policy if exists "update vehicle images" on storage.objects;
create policy "update vehicle images" on storage.objects for update using (bucket_id = 'vehicle-images');

drop policy if exists "delete vehicle images" on storage.objects;
create policy "delete vehicle images" on storage.objects for delete using (bucket_id = 'vehicle-images');
