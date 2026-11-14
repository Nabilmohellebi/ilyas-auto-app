begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'showroom-media',
  'showroom-media',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/avif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins manage showroom media" on storage.objects;

create policy "admins manage showroom media"
on storage.objects
for all
to anon, authenticated
using (
  bucket_id = 'showroom-media'
  and (select private.hbr_admin_session_valid())
)
with check (
  bucket_id = 'showroom-media'
  and (select private.hbr_admin_session_valid())
);

commit;
