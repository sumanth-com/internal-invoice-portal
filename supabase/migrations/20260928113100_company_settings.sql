-- Singleton company profile printed on invoices.
-- Both roles can read it. Only an admin can create or change it.

create table public.company_settings (
  id boolean primary key default true,
  legal_name text not null,
  trade_name text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'India',
  email text,
  phone text,
  website text,
  gstin text,
  pan text,
  logo_url text,
  default_currency char(3) not null default 'INR',
  default_payment_terms text,
  invoice_notes text,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_settings_singleton check (id),
  constraint company_settings_currency_format check (default_currency ~ '^[A-Z]{3}$')
);

create trigger company_settings_set_updated_at
before update on public.company_settings
for each row
execute function public.set_updated_at();

create or replace function public.company_settings_set_updated_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger company_settings_set_updated_by
before insert or update on public.company_settings
for each row
execute function public.company_settings_set_updated_by();

alter table public.company_settings enable row level security;

revoke all on table public.company_settings from anon, public;
grant select, insert, update, delete on table public.company_settings to authenticated;

create policy company_settings_select_members
on public.company_settings
for select
to authenticated
using (public.is_active_member());

create policy company_settings_insert_admin
on public.company_settings
for insert
to authenticated
with check (public.is_admin());

create policy company_settings_update_admin
on public.company_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy company_settings_delete_admin
on public.company_settings
for delete
to authenticated
using (public.is_admin());

comment on table public.company_settings is
  'Single company record used as the invoice issuer.';
