-- Parties an invoice is raised to.
-- Active members of either role can read and maintain beneficiaries.
-- Only an admin can delete one.

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  contact_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'India',
  gstin text,
  pan text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beneficiaries_legal_name_not_blank check (length(btrim(legal_name)) > 0)
);

create index beneficiaries_legal_name_idx on public.beneficiaries (legal_name);
create index beneficiaries_is_active_idx on public.beneficiaries (is_active);

create trigger beneficiaries_set_updated_at
before update on public.beneficiaries
for each row
execute function public.set_updated_at();

create or replace function public.beneficiaries_set_actors()
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
  return new;
end;
$$;

create trigger beneficiaries_set_actors
before insert or update on public.beneficiaries
for each row
execute function public.beneficiaries_set_actors();

alter table public.beneficiaries enable row level security;

revoke all on table public.beneficiaries from anon, public;
grant select, insert, update, delete on table public.beneficiaries to authenticated;

create policy beneficiaries_select_members
on public.beneficiaries
for select
to authenticated
using (public.is_active_member());

create policy beneficiaries_insert_members
on public.beneficiaries
for insert
to authenticated
with check (public.is_active_member());

create policy beneficiaries_update_members
on public.beneficiaries
for update
to authenticated
using (public.is_active_member())
with check (public.is_active_member());

create policy beneficiaries_delete_admin
on public.beneficiaries
for delete
to authenticated
using (public.is_admin());

comment on table public.beneficiaries is
  'Invoice recipients. Deactivate with is_active instead of deleting when history exists.';
