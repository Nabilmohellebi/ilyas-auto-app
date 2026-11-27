-- pg_net is non-relocatable. Reinstall it in extensions only when currently
-- registered in public. Stop the dispatcher and verify there is no queued or
-- stored HTTP data before replacing the extension-owned objects.
do $$
declare
  v_extension_schema text;
  v_pending_requests bigint;
  v_stored_responses bigint;
  v_job_id bigint;
begin
  select n.nspname
    into v_extension_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_net';

  if v_extension_schema = 'public' then
    select count(*) into v_pending_requests from net.http_request_queue;
    select count(*) into v_stored_responses from net._http_response;

    if v_pending_requests > 0 or v_stored_responses > 0 then
      raise exception
        'Cannot move pg_net while HTTP data exists (pending requests: %, stored responses: %)',
        v_pending_requests,
        v_stored_responses;
    end if;

    for v_job_id in
      select jobid from cron.job
      where jobname = 'appointment-reminder-dispatch'
    loop
      perform cron.unschedule(v_job_id);
    end loop;

    execute 'drop extension pg_net';
    execute 'create extension pg_net with schema extensions';

    perform cron.schedule(
      'appointment-reminder-dispatch',
      '*/5 * * * *',
      'select private.process_appointment_reminders();'
    );
  end if;
end;
$$;
