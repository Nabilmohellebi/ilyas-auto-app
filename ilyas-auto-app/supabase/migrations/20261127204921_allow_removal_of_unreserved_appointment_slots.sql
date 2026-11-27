alter table public.reservations
  drop constraint if exists reservations_appointment_slot_id_fkey;

alter table public.reservations
  add constraint reservations_appointment_slot_id_fkey
  foreign key (appointment_slot_id)
  references public.appointment_slots(id)
  on delete set null;
