alter table public.appointment_slots
  add constraint appointment_slots_no_overlapping
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&);
