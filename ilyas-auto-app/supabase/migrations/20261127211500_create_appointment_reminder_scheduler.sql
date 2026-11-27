create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists private.appointment_reminder_deliveries (
  id bigint generated always as identity primary key,
  slot_id uuid not null references public.appointment_slots(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('24h', '1h')),
  http_request_id bigint,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  queued_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_reminder_deliveries_unique unique (slot_id, reminder_type)
);

create index if not exists appointment_reminder_deliveries_pending_idx
  on private.appointment_reminder_deliveries (queued_at)
  where delivered_at is null;

revoke all on table private.appointment_reminder_deliveries from public, anon, authenticated;

create or replace function private.process_appointment_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app_url text;
  v_cron_secret text;
  v_item record;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_app_url
  from vault.decrypted_secrets
  where name = 'vercel_app_url';

  select decrypted_secret
    into v_cron_secret
  from vault.decrypted_secrets
  where name = 'vercel_cron_secret';

  if coalesce(v_app_url, '') = '' or coalesce(v_cron_secret, '') = '' then
    raise warning 'Appointment reminders are not configured: Vercel URL or CRON secret is missing from Vault';
    return;
  end if;

  -- Confirm deliveries from the asynchronous pg_net response table.
  update private.appointment_reminder_deliveries d
     set delivered_at = pg_catalog.now(),
         http_request_id = null,
         last_error = null,
         updated_at = pg_catalog.now()
    from net._http_response response
   where response.id = d.http_request_id
     and response.status_code between 200 and 299
     and d.delivered_at is null;

  -- Release failed requests so they can be retried, up to five attempts.
  update private.appointment_reminder_deliveries d
     set http_request_id = null,
         queued_at = null,
         last_error = pg_catalog.left(
           pg_catalog.coalesce(response.error_msg, response.content, 'HTTP ' || response.status_code::text),
           500
         ),
         updated_at = pg_catalog.now()
    from net._http_response response
   where response.id = d.http_request_id
     and (response.status_code is null or response.status_code < 200 or response.status_code >= 300)
     and d.delivered_at is null
     and d.attempt_count < 5;

  -- Release requests with no response after ten minutes.
  update private.appointment_reminder_deliveries d
     set http_request_id = null,
         queued_at = null,
         last_error = 'Aucune réponse du service de notification après 10 minutes',
         updated_at = pg_catalog.now()
   where d.delivered_at is null
     and d.http_request_id is not null
     and d.queued_at < pg_catalog.now() - interval '10 minutes'
     and d.attempt_count < 5
     and not exists (
       select 1
         from net._http_response response
        where response.id = d.http_request_id
     );

  -- Queue a single reminder record for each booked slot and reminder horizon.
  insert into private.appointment_reminder_deliveries (slot_id, reminder_type)
  select candidate.slot_id, candidate.reminder_type
    from (
      select s.id as slot_id, '24h'::text as reminder_type
        from public.appointment_slots s
        join public.reservations r
          on r.appointment_slot_id = s.id
       where s.status = 'booked'
         and r.statut not in ('annulee', 'refusee')
         and s.starts_at > pg_catalog.now() + interval '23 hours 50 minutes'
         and s.starts_at <= pg_catalog.now() + interval '24 hours'

      union all

      select s.id as slot_id, '1h'::text as reminder_type
        from public.appointment_slots s
        join public.reservations r
          on r.appointment_slot_id = s.id
       where s.status = 'booked'
         and r.statut not in ('annulee', 'refusee')
         and s.starts_at > pg_catalog.now() + interval '50 minutes'
         and s.starts_at <= pg_catalog.now() + interval '1 hour'
    ) candidate
  on conflict (slot_id, reminder_type) do nothing;

  -- Deliver pending reminders. SKIP LOCKED prevents concurrent workers duplicating a send.
  for v_item in
    select
      d.id as delivery_id,
      d.reminder_type,
      s.starts_at,
      s.ends_at,
      s.label,
      r.nom_client,
      r.telephone,
      r.vehicule_nom
    from private.appointment_reminder_deliveries d
    join public.appointment_slots s
      on s.id = d.slot_id
    join public.reservations r
      on r.appointment_slot_id = s.id
   where d.delivered_at is null
     and d.http_request_id is null
     and d.attempt_count < 5
     and s.status = 'booked'
     and r.statut not in ('annulee', 'refusee')
   order by s.starts_at asc
   for update of d skip locked
  loop
    begin
      v_request_id := net.http_post(
        url := pg_catalog.rtrim(v_app_url, '/') || '/api/appointment-reminder',
        body := pg_catalog.jsonb_build_object(
          'reminderType', v_item.reminder_type,
          'startsAt', v_item.starts_at,
          'endsAt', v_item.ends_at,
          'label', v_item.label,
          'clientName', v_item.nom_client,
          'phone', v_item.telephone,
          'vehicleName', v_item.vehicule_nom
        ),
        headers := pg_catalog.jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_cron_secret
        ),
        timeout_milliseconds := 10000
      );

      update private.appointment_reminder_deliveries
         set http_request_id = v_request_id,
             attempt_count = attempt_count + 1,
             queued_at = pg_catalog.now(),
             updated_at = pg_catalog.now(),
             last_error = null
       where id = v_item.delivery_id;
    exception when others then
      update private.appointment_reminder_deliveries
         set attempt_count = attempt_count + 1,
             last_error = pg_catalog.left(sqlerrm, 500),
             updated_at = pg_catalog.now()
       where id = v_item.delivery_id;
    end;
  end loop;
end;
$$;

revoke all on function private.process_appointment_reminders() from public, anon, authenticated;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
      from cron.job
     where jobname = 'appointment-reminder-dispatch'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'appointment-reminder-dispatch',
    '*/5 * * * *',
    'select private.process_appointment_reminders();'
  );
end;
$$;
