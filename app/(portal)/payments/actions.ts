"use server";

import { formatMoney, roundMoney } from "@/lib/invoice";
import {
  emptyPaymentFormState,
  parsePaymentForm,
  paymentBalance,
  paymentErrorMessage,
  type PaymentFormState,
  type RecordedPayment,
} from "@/lib/payment";
import { mapPayment, PAYMENT_COLUMNS, type PaymentRow } from "@/lib/payments";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function cents(value: number) {
  return Math.round(roundMoney(value) * 100);
}

function denied(message: string): PaymentFormState {
  return { error: message, fieldErrors: {} };
}

export async function recordPayment(
  _state: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const parsed = parsePaymentForm(formData);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  const user = await getPortalUser();
  if (!user?.isActive) {
    return denied("You do not have permission to record a payment.");
  }

  const supabase = await createClient();
  const { value } = parsed;
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, status, total, currency, invoice_payments(amount)")
    .eq("id", value.invoiceId)
    .maybeSingle();

  if (invoiceError) return denied(paymentErrorMessage(invoiceError, "The payment could not be recorded."));
  if (!invoice) return denied("This invoice was not found.");
  if (invoice.status !== "issued") {
    return denied("Payments are allowed only for issued invoices.");
  }

  const alreadyPaid = roundMoney(
    ((invoice.invoice_payments ?? []) as { amount: number | string }[]).reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    ),
  );
  const { outstanding } = paymentBalance(Number(invoice.total), alreadyPaid, invoice.status);
  if (cents(value.amount) > cents(outstanding)) {
    return {
      error: null,
      fieldErrors: {
        amount: `Amount cannot exceed the outstanding balance of ${formatMoney(outstanding, invoice.currency)}.`,
      },
    };
  }

  const inserted = await supabase
    .from("invoice_payments")
    .insert({
      invoice_id: value.invoiceId,
      amount: value.amount,
      payment_date: value.paymentDate,
      payment_mode: value.paymentMode,
      reference: value.reference,
    })
    .select(PAYMENT_COLUMNS)
    .single();

  if (inserted.error) {
    const message = paymentErrorMessage(inserted.error, "The payment could not be recorded.");
    if (message.startsWith("Payments cannot exceed")) {
      return { error: null, fieldErrors: { amount: message } };
    }
    return denied(message);
  }

  const { data: balance } = await supabase
    .from("invoice_balances")
    .select("status, total, amount_paid, outstanding")
    .eq("invoice_id", value.invoiceId)
    .maybeSingle();

  const amountPaid = balance ? roundMoney(Number(balance.amount_paid)) : roundMoney(alreadyPaid + value.amount);
  const total = balance ? Number(balance.total) : Number(invoice.total);
  const nextOutstanding = balance
    ? roundMoney(Number(balance.outstanding))
    : roundMoney(Math.max(total - amountPaid, 0));
  const invoiceStatus = balance?.status === "paid" || nextOutstanding <= 0 ? "paid" : "issued";

  const saved: RecordedPayment = {
    payment: mapPayment(inserted.data as PaymentRow),
    total,
    amountPaid,
    outstanding: nextOutstanding,
    invoiceStatus,
  };

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${value.invoiceId}`);
  revalidatePath("/dashboard");

  return { ...emptyPaymentFormState, saved };
}
