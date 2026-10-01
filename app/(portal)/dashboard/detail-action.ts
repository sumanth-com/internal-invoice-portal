"use server";

import { roundMoney, type InvoiceDetail } from "@/lib/invoice";
import { loadInvoice } from "@/lib/invoices";
import { paymentBalance, type PaymentRecord } from "@/lib/payment";
import { loadInvoicePayments } from "@/lib/payments";
import { getPortalUser } from "@/lib/portal-user";

export type DashboardInvoiceDetail = {
  invoice: InvoiceDetail;
  payments: PaymentRecord[];
  amountPaid: number;
  outstanding: number;
};

export async function loadDashboardInvoiceDetail(id: string): Promise<DashboardInvoiceDetail | null> {
  const user = await getPortalUser();
  if (!user?.isActive) return null;

  const invoice = await loadInvoice(id);
  if (!invoice) return null;

  const payments = await loadInvoicePayments(id);
  const amountPaid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const balance = paymentBalance(invoice.total, amountPaid, invoice.status);

  return {
    invoice,
    payments,
    amountPaid: balance.amountPaid,
    outstanding: balance.outstanding,
  };
}
