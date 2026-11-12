-- HBR AUTO — Durcissement des accès publics et de l'administration.
--
-- IMPORTANT : appliquer uniquement APRÈS avoir créé l'utilisateur Supabase Auth
-- du propriétaire et défini auth.users.raw_app_meta_data.role = 'admin'.
-- Sinon personne ne pourra accéder à l'administration existante.
--
-- Les visiteurs conservent uniquement les lectures publiques du stock actif,
-- des paramètres autorisés, de la bannière active et des témoignages actifs,
-- ainsi que l'insertion des demandes de réservation / reprise.
-- Les écritures de gestion sont réservées à l'administrateur authentifié.

begin;

-- VEHICULES
drop policy if exists "manage vehicles" on public.vehicles;
drop policy if exists "read active vehicles" on public.vehicles;

create policy "public read active vehicles"
on public.vehicles
for select
to anon, authenticated
using (is_active = true);

create policy "admins manage vehicles"
on public.vehicles
for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.vehicles to anon, authenticated;
grant insert, update, delete on public.vehicles to authenticated;

-- RESERVATIONS : aucune lecture publique des coordonnées / messages clients.
drop policy if exists "insert reservations" on public.reservations;
drop policy if exists "manage reservations" on public.reservations;

create policy "public insert reservations"
on public.reservations
for insert
to anon, authenticated
with check (true);

create policy "admins manage reservations"
on public.reservations
for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant insert on public.reservations to anon, authenticated;
grant select, update, delete on public.reservations to authenticated;

-- DEMANDES D'ACHAT / VENTE / ECHANGE
drop policy if exists "insert sell requests" on public.sell_requests;
drop policy if exists "manage sell requests" on public.sell_requests;

create policy "public insert sell requests"
on public.sell_requests
for insert
to anon, authenticated
with check (true);

create policy "admins manage sell requests"
on public.sell_requests
for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant insert on public.sell_requests to anon, authenticated;
grant select, update, delete on public.sell_requests to authenticated;

-- PARAMETRES : le public ne peut lire que les clés explicitement autorisées.
drop policy if exists "read settings" on public.settings;
drop policy if exists "manage settings" on public.settings;

create policy "public read safe settings"
on public.settings
for select
to anon, authenticated
using (key = any (array[
  'shop_name',
  'shop_phone',
  'shop_whatsapp',
  'shop_email',
  'shop_address',
  'shop_horaires',
  'shop_maps_url',
  'shop_maps_embed',
  'shop_phones',
  'maintenance',
  'trade_margin_percent'
]));

create policy "admins manage settings"
on public.settings
for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;

-- BANNIERE : seuls les messages actifs sont visibles publiquement.
drop policy if exists "read banner" on public.banner_messages;
drop policy if exists "manage banner" on public.banner_messages;

create policy "public read active banner"
on public.banner_messages
for select
to anon, authenticated
using (actif = true);

create policy "admins manage banner"
on public.banner_messages
for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.banner_messages to anon, authenticated;
grant insert, update, delete on public.banner_messages to authenticated;

-- TEMOIGNAGES : seuls les témoignages actifs sont visibles publiquement.
drop policy if exists "read testimonials" on public.testimonials;
drop policy if exists "manage testimonials" on public.testimonials;

create policy "public read active testimonials"
on public.testimonials
for select
to anon, authenticated
using (actif = true);

create policy "admins manage testimonials"
on public.testimonials
for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

-- STORAGE : les photos restent publiques en lecture, les changements sont admin.
drop policy if exists "public read vehicle images" on storage.objects;
drop policy if exists "upload vehicle images" on storage.objects;
drop policy if exists "update vehicle images" on storage.objects;
drop policy if exists "delete vehicle images" on storage.objects;

create policy "public read vehicle images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'vehicle-images');

create policy "admins manage vehicle images"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'vehicle-images'
  and (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
)
with check (
  bucket_id = 'vehicle-images'
  and (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
);

-- REGISTRE FINANCIER : aucun accès anon / public.
drop policy if exists "admins manage vehicle finances" on public.vehicle_finances;
create policy "admins manage vehicle finances"
on public.vehicle_finances
for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant select, insert, update, delete on public.vehicle_finances to authenticated;
revoke all on public.vehicle_finances from anon, public;

commit;
