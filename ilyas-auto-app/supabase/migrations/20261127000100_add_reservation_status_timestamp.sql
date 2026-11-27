alter table public.reservations
  add column if not exists status_updated_at timestamptz;

update public.reservations
set status_updated_at = coalesce(created_at, now())
where status_updated_at is null;

alter table public.reservations
  alter column status_updated_at set default now(),
  alter column status_updated_at set not null;

create or replace function public.set_reservation_status_updated_at()
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

drop trigger if exists reservations_status_updated_at on public.reservations;
create trigger reservations_status_updated_at
before update of statut on public.reservations
for each row
execute function public.set_reservation_status_updated_at();
