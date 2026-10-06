-- Administrators can clear their own invoice activity. Ordinary edits and
-- deletes stay blocked, including while an invoice itself is being removed.

create or replace function public.prevent_invoice_audit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE'
    and (
      current_setting('audit.clearing', true) = 'on'
      or current_setting('invoices.deleting_id', true) = old.invoice_id::text
    )
  then
    return old;
  end if;

  raise exception 'Audit records cannot be changed';
end;
$$;

create or replace function public.clear_invoice_audit_log()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only an administrator can clear the audit log';
  end if;

  perform set_config('audit.clearing', 'on', true);

  delete from public.invoice_audit_log
  where exists (
    select 1
    from public.invoices
    where invoices.id = invoice_audit_log.invoice_id
      and invoices.created_by = auth.uid()
  );
end;
$$;

revoke all on function public.clear_invoice_audit_log() from public, anon;
grant execute on function public.clear_invoice_audit_log() to authenticated;
