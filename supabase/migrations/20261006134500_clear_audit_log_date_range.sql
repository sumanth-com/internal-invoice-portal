-- Clearing the audit log is limited to the selected date window.
-- A call without either bound is rejected so the full history cannot be removed at once.

drop function if exists public.clear_invoice_audit_log();

create function public.clear_invoice_audit_log(from_at timestamptz, to_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only an administrator can clear the audit log';
  end if;

  if from_at is null and to_at is null then
    raise exception 'Choose a date range before deleting activity';
  end if;

  perform set_config('audit.clearing', 'on', true);

  delete from public.invoice_audit_log
  where (from_at is null or invoice_audit_log.created_at >= from_at)
    and (to_at is null or invoice_audit_log.created_at < to_at)
    and exists (
      select 1
      from public.invoices
      where invoices.id = invoice_audit_log.invoice_id
        and invoices.created_by = auth.uid()
    );
end;
$$;

revoke all on function public.clear_invoice_audit_log(timestamptz, timestamptz) from public, anon;
grant execute on function public.clear_invoice_audit_log(timestamptz, timestamptz) to authenticated;
