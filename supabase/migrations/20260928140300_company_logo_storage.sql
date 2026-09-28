-- Private logo files for the company invoice template.
-- Admins upload and replace objects. Active members can read them.
-- The bucket is not public.

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', false);

create policy company_logos_member_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-logos'
  and public.is_active_member()
);

create policy company_logos_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and public.is_admin()
);

create policy company_logos_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-logos'
  and public.is_admin()
)
with check (
  bucket_id = 'company-logos'
  and public.is_admin()
);

create policy company_logos_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-logos'
  and public.is_admin()
);
