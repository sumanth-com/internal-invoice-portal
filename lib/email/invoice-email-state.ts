export type EmailInvoiceState = {
  error: string | null;
  fieldErrors: { recipient?: string };
  sent: boolean;
};

export const emptyEmailInvoiceState: EmailInvoiceState = {
  error: null,
  fieldErrors: {},
  sent: false,
};
