-- New audit labels for payment edits and deletions.
-- Values are added in their own migration so later migrations can use them.

alter type public.invoice_audit_action add value if not exists 'payment_updated';
alter type public.invoice_audit_action add value if not exists 'payment_deleted';
