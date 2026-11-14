-- HBR AUTO — Authentification administrateur par mot de passe unique.
-- Aucun e-mail réel ni compte Supabase Auth n'est requis.
-- Le mot de passe est stocké sous forme bcrypt dans le schéma privé.
-- Le navigateur ne conserve qu'un jeton de session aléatoire (12 heures).

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists private.hbr_admin_credentials (
  singleton boolean primary key default true check (singleton = true),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists private.hbr_admin_sessions (
  token_hash text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists private.hbr_admin_login_attempts (
  client_key text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now()
);

revoke all on all tables in schema private from public, anon, authenticated;

create or replace function private.hbr_admin_session_valid()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request_headers jsonb;
  request_token text;
begin
  request_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  request_token := request_headers ->> 'x-hbr-admin-session';

  if request_token is null or length(request_token) < 32 or length(request_token) > 128 then
    return false;
  end if;

  return exists (
    select 1
    from private.hbr_admin_sessions s
    where s.token_hash = encode(extensions.digest(request_token, 'sha256'), 'hex')
      and s.expires_at > now()
  );
exception
  when others then return false;
end;
$$;

revoke all on function private.hbr_admin_session_valid() from public;
grant execute on function private.hbr_admin_session_valid() to anon, authenticated;

create or replace function private.hbr_admin_login(p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_token text;
  v_headers jsonb;
  v_client text;
  v_attempts integer;
  v_window timestamptz;
begin
  if p_password is null or length(p_password) < 12 or length(p_password) > 256 then
    return null;
  end if;

  v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  v_client := left(coalesce(
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    v_headers ->> 'x-forwarded-for',
    'unknown'
  ), 120);

  select attempts, window_started_at
    into v_attempts, v_window
  from private.hbr_admin_login_attempts
  where client_key = v_client;

  if v_window is not null and v_window > now() - interval '15 minutes' and v_attempts >= 10 then
    return null;
  end if;

  select password_hash into v_hash
  from private.hbr_admin_credentials
  where singleton = true;

  if v_hash is null or extensions.crypt(p_password, v_hash) <> v_hash then
    insert into private.hbr_admin_login_attempts (client_key, attempts, window_started_at)
    values (v_client, 1, now())
    on conflict (client_key) do update
      set attempts = case
        when private.hbr_admin_login_attempts.window_started_at <= now() - interval '15 minutes'
          then 1
        else private.hbr_admin_login_attempts.attempts + 1
      end,
      window_started_at = case
        when private.hbr_admin_login_attempts.window_started_at <= now() - interval '15 minutes'
          then now()
        else private.hbr_admin_login_attempts.window_started_at
      end;
    return null;
  end if;

  delete from private.hbr_admin_login_attempts where client_key = v_client;
  delete from private.hbr_admin_sessions where expires_at <= now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.hbr_admin_sessions (token_hash, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '12 hours');

  return v_token;
end;
$$;

revoke all on function private.hbr_admin_login(text) from public;
grant execute on function private.hbr_admin_login(text) to anon, authenticated;

create or replace function public.admin_login(p_password text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.hbr_admin_login(p_password); $$;

revoke all on function public.admin_login(text) from public;
grant execute on function public.admin_login(text) to anon, authenticated;

create or replace function public.admin_check_session()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.hbr_admin_session_valid(); $$;

revoke all on function public.admin_check_session() from public;
grant execute on function public.admin_check_session() to anon, authenticated;

create or replace function private.hbr_admin_logout()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_headers jsonb;
  v_token text;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  v_token := v_headers ->> 'x-hbr-admin-session';
  if v_token is null then return true; end if;

  delete from private.hbr_admin_sessions
  where token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex');
  return true;
end;
$$;

revoke all on function private.hbr_admin_logout() from public;
grant execute on function private.hbr_admin_logout() to anon, authenticated;

create or replace function public.admin_logout()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.hbr_admin_logout(); $$;

revoke all on function public.admin_logout() from public;
grant execute on function public.admin_logout() to anon, authenticated;

create or replace function private.hbr_admin_change_password(p_current_password text, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_headers jsonb;
  v_token text;
  v_token_hash text;
begin
  if p_new_password is null or length(p_new_password) < 12 or length(p_new_password) > 256 then
    raise exception 'Le nouveau mot de passe doit contenir au moins 12 caractères.';
  end if;

  v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  v_token := v_headers ->> 'x-hbr-admin-session';
  if v_token is null or not private.hbr_admin_session_valid() then
    raise exception 'Session administrateur invalide ou expirée.';
  end if;

  select password_hash into v_hash
  from private.hbr_admin_credentials
  where singleton = true
  for update;

  if v_hash is null or extensions.crypt(p_current_password, v_hash) <> v_hash then
    return false;
  end if;

  update private.hbr_admin_credentials
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
      updated_at = now()
  where singleton = true;

  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  delete from private.hbr_admin_sessions where token_hash <> v_token_hash;
  return true;
end;
$$;

revoke all on function private.hbr_admin_change_password(text, text) from public;
grant execute on function private.hbr_admin_change_password(text, text) to anon, authenticated;

create or replace function public.admin_change_password(p_current_password text, p_new_password text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.hbr_admin_change_password(p_current_password, p_new_password); $$;

revoke all on function public.admin_change_password(text, text) from public;
grant execute on function public.admin_change_password(text, text) to anon, authenticated;

-- STOCK : lecture du stock actif pour le public ; gestion complète admin.
drop policy if exists "manage vehicles" on public.vehicles;
drop policy if exists "read active vehicles" on public.vehicles;
drop policy if exists "public read active vehicles" on public.vehicles;
drop policy if exists "admins manage vehicles" on public.vehicles;

create policy "public read active vehicles"
on public.vehicles for select to anon, authenticated
using (is_active = true or (select private.hbr_admin_session_valid()));

create policy "admins manage vehicles"
on public.vehicles for all to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.vehicles to anon, authenticated;

-- RESERVATIONS : insertion publique seulement, lecture et gestion admin.
drop policy if exists "insert reservations" on public.reservations;
drop policy if exists "manage reservations" on public.reservations;
drop policy if exists "public insert reservations" on public.reservations;
drop policy if exists "admins manage reservations" on public.reservations;

create policy "public insert reservations"
on public.reservations for insert to anon, authenticated
with check (true);

create policy "admins manage reservations"
on public.reservations for all to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.reservations to anon, authenticated;

-- DEMANDES DE VENTE ET D'ECHANGE : insertion publique seulement.
drop policy if exists "insert sell requests" on public.sell_requests;
drop policy if exists "manage sell requests" on public.sell_requests;
drop policy if exists "public insert sell requests" on public.sell_requests;
drop policy if exists "admins manage sell requests" on public.sell_requests;

create policy "public insert sell requests"
on public.sell_requests for insert to anon, authenticated
with check (true);

create policy "admins manage sell requests"
on public.sell_requests for all to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.sell_requests to anon, authenticated;

-- PARAMETRES : liste blanche publique ; toutes les autres clés sont admin.
drop policy if exists "read settings" on public.settings;
drop policy if exists "manage settings" on public.settings;
drop policy if exists "public read safe settings" on public.settings;
drop policy if exists "admins manage settings" on public.settings;

create policy "public read safe settings"
on public.settings for select to anon, authenticated
using (
  key = any (array[
    'shop_name', 'shop_phone', 'shop_whatsapp', 'shop_email', 'shop_address',
    'shop_horaires', 'shop_maps_url', 'shop_maps_embed', 'shop_phones', 'brand_identity', 'hero_images',
    'maintenance', 'trade_margin_percent', 'site_theme'
  ])
  or (select private.hbr_admin_session_valid())
);

create policy "admins manage settings"
on public.settings for all to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.settings to anon, authenticated;

-- BANNIERE : lecture des messages actifs ; écriture admin.
drop policy if exists "read banner" on public.banner_messages;
drop policy if exists "manage banner" on public.banner_messages;
drop policy if exists "public read active banner" on public.banner_messages;
drop policy if exists "admins manage banner" on public.banner_messages;

create policy "public read active banner"
on public.banner_messages for select to anon, authenticated
using (actif = true or (select private.hbr_admin_session_valid()));

create policy "admins manage banner"
on public.banner_messages for all to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.banner_messages to anon, authenticated;

-- TEMOIGNAGES : seuls les témoignages actifs sont publics.
drop policy if exists "read testimonials" on public.testimonials;
drop policy if exists "manage testimonials" on public.testimonials;
drop policy if exists "public read active testimonials" on public.testimonials;
drop policy if exists "admins manage testimonials" on public.testimonials;

create policy "public read active testimonials"
on public.testimonials for select to anon, authenticated
using (actif = true or (select private.hbr_admin_session_valid()));

create policy "admins manage testimonials"
on public.testimonials for all to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.testimonials to anon, authenticated;

-- FINANCES : jamais accessibles sans un jeton admin valide.
drop policy if exists "admins manage vehicle finances" on public.vehicle_finances;
create policy "admins manage vehicle finances"
on public.vehicle_finances for all to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on public.vehicle_finances to anon, authenticated;
revoke all on public.vehicle_finances from public;

-- STORAGE : les photos restent publiques en lecture ; toute écriture exige admin.
drop policy if exists "public read vehicle images" on storage.objects;
drop policy if exists "upload vehicle images" on storage.objects;
drop policy if exists "update vehicle images" on storage.objects;
drop policy if exists "delete vehicle images" on storage.objects;
drop policy if exists "admins manage vehicle images" on storage.objects;

create policy "public read vehicle images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'vehicle-images');

create policy "admins manage vehicle images"
on storage.objects for all to anon, authenticated
using (
  bucket_id = 'vehicle-images'
  and (select private.hbr_admin_session_valid())
)
with check (
  bucket_id = 'vehicle-images'
  and (select private.hbr_admin_session_valid())
);

commit;
