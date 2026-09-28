-- Profiles, roles, and shared helpers for the Internal Invoice Portal.
-- The first signed-up user becomes admin. Later users become internal users.
-- Role changes are admin-only. Client-supplied signup metadata cannot set a role.

create type public.app_role as enum ('admin', 'internal_user');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.app_role not null default 'internal_user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_unique unique (email)
);

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_active_member() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_member() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role;
begin
  perform pg_advisory_xact_lock(8412001);

  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
  else
    assigned_role := 'internal_user';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name'
      ),
      ''
    ),
    assigned_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    perform set_config('profiles.syncing_auth', '1', true);
    update public.profiles
    set email = new.email
    where id = new.id;
    perform set_config('profiles.syncing_auth', '0', true);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
execute function public.sync_profile_email();

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('profiles.syncing_auth', true) = '1' then
    return new;
  end if;

  if not public.is_admin() then
    if new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email
      or new.id is distinct from old.id
    then
      raise exception 'Only an admin can change role, active status, or email';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileges
before update on public.profiles
for each row
execute function public.protect_profile_privileges();

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, public;
grant select, update on table public.profiles to authenticated;

create policy profiles_select_own_or_members
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_active_member()
);

create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  public.is_admin()
  or (id = auth.uid() and public.is_active_member())
)
with check (
  public.is_admin()
  or (id = auth.uid() and public.is_active_member())
);

insert into public.profiles (id, email, full_name, role)
select
  users.id,
  users.email,
  nullif(
    coalesce(
      users.raw_user_meta_data ->> 'full_name',
      users.raw_user_meta_data ->> 'name'
    ),
    ''
  ),
  case
    when users.id = (
      select id from auth.users order by created_at, id limit 1
    )
      then 'admin'::public.app_role
    else 'internal_user'::public.app_role
  end
from auth.users as users;

comment on table public.profiles is
  'Application user linked to auth.users. role is admin or internal_user.';
