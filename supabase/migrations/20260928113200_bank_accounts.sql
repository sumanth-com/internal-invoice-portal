-- Company bank accounts shown on invoices for payment.
-- Both roles can read them. Only an admin can change them.
-- At most one account can be the default.

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  account_holder_name text not null,
  bank_name text not null,
  account_number text not null,
  ifsc_code text,
  swift_code text,
  branch text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_accounts_account_number_not_blank check (length(btrim(account_number)) > 0),
  constraint bank_accounts_ifsc_format check (
    ifsc_code is null or ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'
  ),
  constraint bank_accounts_identity_unique unique (bank_name, account_number)
);

create unique index bank_accounts_one_default_idx
on public.bank_accounts (is_default)
where is_default;

create trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row
execute function public.set_updated_at();

create or replace function public.bank_accounts_set_actors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
  end if;
  new.updated_by = auth.uid();
  if new.ifsc_code is not null then
    new.ifsc_code = upper(btrim(new.ifsc_code));
  end if;
  return new;
end;
$$;

create trigger bank_accounts_set_actors
before insert or update on public.bank_accounts
for each row
execute function public.bank_accounts_set_actors();

alter table public.bank_accounts enable row level security;

revoke all on table public.bank_accounts from anon, public;
grant select, insert, update, delete on table public.bank_accounts to authenticated;

create policy bank_accounts_select_members
on public.bank_accounts
for select
to authenticated
using (public.is_active_member());

create policy bank_accounts_insert_admin
on public.bank_accounts
for insert
to authenticated
with check (public.is_admin());

create policy bank_accounts_update_admin
on public.bank_accounts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy bank_accounts_delete_admin
on public.bank_accounts
for delete
to authenticated
using (public.is_admin());

comment on table public.bank_accounts is
  'Company receiving accounts that can be printed on an invoice.';
