"use server";

import { formatMoney, roundMoney } from "@/lib/invoice";
import {
  emptyPaymentFormState,
  parsePaymentForm,
  paymentBalance,
  paymentErrorMessage,
  type PaymentDeleteState,
  type PaymentFormState,
  type RecordedPayment,
} from "@/lib/payment";
import { isInvoiceId } from "@/lib/invoice";
import { loadPayableInvoices, mapPayment, PAYMENT_COLUMNS, type PaymentRow } from "@/lib/payments";
import { recordInvoiceNotification } from "@/lib/portal-notifications";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function cents(value: number) {
  return Math.round(roundMoney(value) * 100);
}

function denied(message: string): PaymentFormState {
  return { error: message, fieldErrors: {} };
}

export async function listPayableInvoices() {
  const user = await getPortalUser();
  if (!user?.isActive) return [];
  return loadPayableInvoices();
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
    .select("id, status, total, balance_due, currency, invoice_payments(amount)")
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
  const { outstanding } = paymentBalance(Number(invoice.balance_due), alreadyPaid, invoice.status);
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
    : roundMoney(Math.max(Number(invoice.balance_due) - amountPaid, 0));
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
  if (invoiceStatus === "paid") {
    await recordInvoiceNotification(value.invoiceId, "invoice_paid");
  }

  return { ...emptyPaymentFormState, saved };
}

async function recordedPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payment: PaymentRow,
): Promise<RecordedPayment> {
  const { data: balance } = await supabase
    .from("invoice_balances")
    .select("status, total, amount_paid, outstanding")
    .eq("invoice_id", payment.invoice_id)
    .maybeSingle();

  const mapped = mapPayment(payment);
  const total = balance ? Number(balance.total) : mapped.amount;
  const amountPaid = balance ? roundMoney(Number(balance.amount_paid)) : mapped.amount;
  const outstanding = balance
    ? roundMoney(Number(balance.outstanding))
    : paymentBalance(total, amountPaid, "issued").outstanding;
  const invoiceStatus = balance?.status === "paid" || outstanding <= 0 ? "paid" : "issued";

  return {
    payment: mapped,
    total,
    amountPaid,
    outstanding,
    invoiceStatus,
  };
}

export async function updatePayment(
  _state: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const parsed = parsePaymentForm(formData);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  const paymentId = String(formData.get("payment_id") ?? "").trim();
  if (!isInvoiceId(paymentId)) return denied("This payment was not found.");

  const user = await getPortalUser();
  if (!user?.isActive) return denied("You do not have permission to change this payment.");

  const supabase = await createClient();
  const existing = await supabase
    .from("invoice_payments")
    .select("id, invoice_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (existing.error) {
    return denied(paymentErrorMessage(existing.error, "The payment could not be updated."));
  }
  if (!existing.data) return denied("This payment was not found.");
  if (existing.data.invoice_id !== parsed.value.invoiceId) {
    return denied("This payment stays on its original invoice.");
  }

  const [invoiceResult, paymentsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("status, balance_due, currency")
      .eq("id", existing.data.invoice_id)
      .maybeSingle(),
    supabase.from("invoice_payments").select("id, amount").eq("invoice_id", existing.data.invoice_id),
  ]);

  if (invoiceResult.error || paymentsResult.error) {
    return denied(
      paymentErrorMessage(
        invoiceResult.error ?? paymentsResult.error,
        "The payment could not be updated.",
      ),
    );
  }
  if (!invoiceResult.data) return denied("This invoice was not found.");
  if (invoiceResult.data.status !== "issued" && invoiceResult.data.status !== "paid") {
    return denied("Payments are allowed only for issued invoices.");
  }

  const others = roundMoney(
    ((paymentsResult.data ?? []) as { id: string; amount: number | string }[])
      .filter((payment) => payment.id !== paymentId)
      .reduce((sum, payment) => sum + Number(payment.amount), 0),
  );
  const room = roundMoney(Math.max(Number(invoiceResult.data.balance_due) - others, 0));
  if (cents(parsed.value.amount) > cents(room)) {
    return {
      error: null,
      fieldErrors: {
        amount: `Amount cannot exceed the outstanding balance of ${formatMoney(room, invoiceResult.data.currency)}.`,
      },
    };
  }

  const updated = await supabase
    .from("invoice_payments")
    .update({
      amount: parsed.value.amount,
      payment_date: parsed.value.paymentDate,
      payment_mode: parsed.value.paymentMode,
      reference: parsed.value.reference,
    })
    .eq("id", paymentId)
    .select(PAYMENT_COLUMNS)
    .single();

  if (updated.error) {
    const message = paymentErrorMessage(updated.error, "The payment could not be updated.");
    if (message.startsWith("Payments cannot exceed")) {
      return { error: null, fieldErrors: { amount: message } };
    }
    return denied(message);
  }

  const saved = await recordedPayment(supabase, updated.data as PaymentRow);
  if (invoiceResult.data.status !== "paid" && saved.invoiceStatus === "paid") {
    await recordInvoiceNotification(parsed.value.invoiceId, "invoice_paid");
  }
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${parsed.value.invoiceId}`);
  revalidatePath("/dashboard");
  return { ...emptyPaymentFormState, saved };
}

export async function deletePayment(
  _state: PaymentDeleteState,
  formData: FormData,
): Promise<PaymentDeleteState> {
  const paymentId = String(formData.get("payment_id") ?? "").trim();
  if (!isInvoiceId(paymentId)) return { error: "This payment was not found." };

  const user = await getPortalUser();
  if (!user?.isActive) return { error: "You do not have permission to delete this payment." };

  const supabase = await createClient();
  const existing = await supabase
    .from("invoice_payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", paymentId)
    .maybeSingle();

  if (existing.error) {
    return { error: paymentErrorMessage(existing.error, "The payment could not be deleted.") };
  }
  if (!existing.data) return { error: "This payment was not found." };

  const row = existing.data as PaymentRow;
  const removed = await supabase.from("invoice_payments").delete().eq("id", paymentId).select("id");
  if (removed.error) {
    return { error: paymentErrorMessage(removed.error, "The payment could not be deleted.") };
  }
  if (!removed.data?.length) return { error: "This payment was not found." };

  const deleted = await recordedPayment(supabase, row);
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${row.invoice_id}`);
  revalidatePath("/dashboard");
  return { error: null, deleted };
}
