-- Store the company CIN and replace the placeholder issuer profile.

alter table public.company_settings
  add column cin text;

alter table public.company_settings
  add constraint company_settings_cin_format
  check (
    cin is null
    or cin ~ '^[A-Z][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'
  );

update public.company_settings
set
  legal_name = 'iFranchise Services Private Limited',
  trade_name = 'iFranchise',
  address_line1 = 'Innov 8 Mantri Commercio, Tower A, No 51, 5th floor',
  address_line2 = 'Bellandur, Bangalore South',
  city = 'Bangalore',
  state = 'Karnataka',
  postal_code = '560103',
  country = 'India',
  email = 'contact@ifranchise.in',
  phone = '+91 9129130303',
  website = 'https://www.ifranchise.in',
  gstin = '29AAJCI1190D1ZM',
  pan = 'AAJCI1190D',
  cin = 'U70200KA2026PTC227424'
where id = true;

update public.bank_accounts
set account_holder_name = 'iFranchise Services Private Limited'
where account_holder_name = 'Northwind Traders Pvt Ltd';

-- Existing invoices keep their tax amounts. Only the saved issuer text changes.
alter table public.invoices disable trigger user;

update public.invoices
set bill_from = $bill$iFranchise Services Private Limited
iFranchise
Innov 8 Mantri Commercio, Tower A, No 51, 5th floor
Bellandur, Bangalore South
Bangalore, Karnataka 560103
India
GSTIN: 29AAJCI1190D1ZM
PAN: AAJCI1190D
CIN: U70200KA2026PTC227424
contact@ifranchise.in
+91 9129130303$bill$
where bill_from is not null;

alter table public.invoices enable trigger user;
