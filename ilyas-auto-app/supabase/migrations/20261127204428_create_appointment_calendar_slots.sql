create table if not exists public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  label text not null default 'Visite / présentation du véhicule',
  status text not null default 'open'
    check (status in ('open', 'booked', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_slots_positive_duration check (ends_at > starts_at),
  constraint appointment_slots_unique_start unique (starts_at)
);

create index if not exists appointment_slots_open_starts_idx
  on public.appointment_slots (starts_at)
  where status = 'open';

alter table public.appointment_slots enable row level security;

drop policy if exists "public read open future appointment slots" on public.appointment_slots;
create policy "public read open future appointment slots"
on public.appointment_slots
for select
to anon, authenticated
using (
  (status = 'open' and starts_at > now())
  or (select private.hbr_admin_session_valid())
);

drop policy if exists "admins manage appointment slots" on public.appointment_slots;
create policy "admins manage appointment slots"
on public.appointment_slots
for all
to anon, authenticated
using ((select private.hbr_admin_session_valid()))
with check ((select private.hbr_admin_session_valid()));

grant select, insert, update, delete on table public.appointment_slots to anon, authenticated;

alter table public.reservations
  add column if not exists appointment_slot_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'reservations_appointment_slot_id_fkey'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_appointment_slot_id_fkey
      foreign key (appointment_slot_id)
      references public.appointment_slots(id);
  end if;
end;
$$;

create index if not exists reservations_appointment_slot_id_idx
  on public.reservations (appointment_slot_id)
  where appointment_slot_id is not null;

create or replace function private.handle_reservation_appointment_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.appointment_slots%rowtype;
  v_should_claim boolean := false;
begin
  if tg_op = 'UPDATE' then
    if old.appointment_slot_id is not null
      and (
        new.appointment_slot_id is distinct from old.appointment_slot_id
        or (
          old.statut not in ('annulee', 'refusee')
          and new.statut in ('annulee', 'refusee')
        )
      ) then
      update public.appointment_slots
      set status = 'open',
          updated_at = pg_catalog.now()
      where id = old.appointment_slot_id
        and status = 'booked'
        and starts_at > pg_catalog.now();
    end if;

    v_should_claim :=
      new.appointment_slot_id is not null
      and (
        new.appointment_slot_id is distinct from old.appointment_slot_id
        or (
          old.statut in ('annulee', 'refusee')
          and new.statut not in ('annulee', 'refusee')
        )
      );
  else
    v_should_claim := new.appointment_slot_id is not null;
  end if;

  if v_should_claim and new.statut not in ('annulee', 'refusee') then
    select *
    into v_slot
    from public.appointment_slots
    where id = new.appointment_slot_id
    for update;

    if not found
      or v_slot.status <> 'open'
      or v_slot.starts_at <= pg_catalog.now() then
      raise exception using
        errcode = 'P0001',
        message = 'APPOINTMENT_SLOT_UNAVAILABLE';
    end if;

    update public.appointment_slots
    set status = 'booked',
        updated_at = pg_catalog.now()
    where id = v_slot.id;

    new.date_souhaitee := pg_catalog.to_char(
      v_slot.starts_at at time zone 'Africa/Algiers',
      'DD/MM/YYYY HH24:MI'
    );
  end if;

  return new;
end;
$$;

create or replace function private.release_reservation_appointment_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.appointment_slot_id is not null then
    update public.appointment_slots
    set status = 'open',
        updated_at = pg_catalog.now()
    where id = old.appointment_slot_id
      and status = 'booked'
      and starts_at > pg_catalog.now();
  end if;
  return old;
end;
$$;

revoke all on function private.handle_reservation_appointment_slot() from public, anon, authenticated;
revoke all on function private.release_reservation_appointment_slot() from public, anon, authenticated;

drop trigger if exists reservations_appointment_slot_guard on public.reservations;
create trigger reservations_appointment_slot_guard
before insert or update of appointment_slot_id, statut
on public.reservations
for each row
execute function private.handle_reservation_appointment_slot();

drop trigger if exists reservations_appointment_slot_release_on_delete on public.reservations;
create trigger reservations_appointment_slot_release_on_delete
after delete on public.reservations
for each row
execute function private.release_reservation_appointment_slot();
