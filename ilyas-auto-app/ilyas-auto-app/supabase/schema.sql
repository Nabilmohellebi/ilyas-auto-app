-- ══════════════════════════════════════════════════════════
-- ILYAS AUTO — Schéma Supabase
-- Coller dans : Supabase → SQL Editor → Run
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
  statut        text not null default 'disponible', -- disponible | reserve | vendu
  description   text,
  specs         jsonb default '[]',
  images        jsonb default '[]',
  img           text,
  display_order integer default 99,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ── Table Reservations ────────────────────────────────────
create table if not exists public.reservations (
  id             text primary key,
  vehicle_id     bigint references public.vehicles(id) on delete set null,
  vehicule_nom   text not null,   -- snapshot : "Marque Modèle (Année)"
  vehicule_prix  numeric not null default 0,
  nom_client     text not null,
  telephone      text not null,
  message        text,
  statut         text not null default 'nouvelle', -- nouvelle | contactee | vendue | annulee
  created_at     timestamptz default now()
);

-- ── Table Settings (réutilisée pour les réglages boutique) ──
create table if not exists public.settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- ── RLS ───────────────────────────────────────────────────
alter table public.vehicles     enable row level security;
alter table public.reservations enable row level security;
alter table public.settings     enable row level security;

-- Lecture publique des véhicules actifs
create policy "read active vehicles"
  on public.vehicles for select
  using (is_active = true);

-- Gestion complète (admin — via clé anon, protégé par mot de passe côté app)
create policy "manage vehicles"
  on public.vehicles for all
  using (true) with check (true);

-- Création de réservation ouverte à tous (formulaire public)
create policy "insert reservations"
  on public.reservations for insert
  with check (true);

-- Gestion complète des réservations (admin)
create policy "manage reservations"
  on public.reservations for all
  using (true) with check (true);

-- Réglages : lecture publique + écriture (admin)
create policy "read settings"
  on public.settings for select
  using (true);

create policy "manage settings"
  on public.settings for all
  using (true) with check (true);

-- ── Storage bucket vehicle-images ─────────────────────────
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict do nothing;

create policy "public read vehicle images"
  on storage.objects for select
  using (bucket_id = 'vehicle-images');

create policy "upload vehicle images"
  on storage.objects for insert
  with check (bucket_id = 'vehicle-images');

create policy "update vehicle images"
  on storage.objects for update
  using (bucket_id = 'vehicle-images');

create policy "delete vehicle images"
  on storage.objects for delete
  using (bucket_id = 'vehicle-images');

-- ── Véhicules de démonstration ─────────────────────────────
insert into public.vehicles (marque, modele, annee, prix, km, transmission, carburant, provenance, statut, description, specs, display_order)
values
  ('Mercedes-Benz', 'Classe C 220d AMG Line', 2021, 9800000, 45000, 'Automatique', 'Diesel', 'allemagne', 'disponible',
   'Véhicule importé d''Allemagne, entretien suivi, carnet complet.',
   '["Toit ouvrant", "Caméra de recul", "Sièges chauffants", "GPS intégré"]', 1),
  ('BMW', 'Série 3 320i M Sport', 2020, 8450000, 62000, 'Automatique', 'Essence', 'allemagne', 'disponible',
   'Finition M Sport, jantes 19 pouces, intérieur cuir.',
   '["Jantes 19 pouces", "Intérieur cuir", "Régulateur adaptatif"]', 2);
