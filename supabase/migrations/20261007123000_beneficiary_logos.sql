-- Brand logos for beneficiaries. Files stay private and are stored
-- under the owner's folder. The app accepts raster images up to 4 MB.

alter table public.beneficiaries
  add column if not exists logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'beneficiary-logos',
  'beneficiary-logos',
  false,
  4194304,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/avif',
    'image/tiff',
    'image/heic',
    'image/heif',
    'image/x-icon'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy beneficiary_logos_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'beneficiary-logos'
  and public.is_active_member()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy beneficiary_logos_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'beneficiary-logos'
  and public.is_active_member()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy beneficiary_logos_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'beneficiary-logos'
  and public.is_active_member()
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);
