import { type NotificationKind } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const DEDUPE_WINDOW_MS = 5000;

function eventKey(kind: NotificationKind, subjectId: string) {
  return `${kind}:${subjectId}:${Math.floor(Date.now() / DEDUPE_WINDOW_MS)}`;
}

export async function recordPortalNotification(entry: {
  eventKey: string;
  kind: NotificationKind;
  title: string;
  message: string;
  subject?: string | null;
}) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("portal_notifications").insert({
      event_key: entry.eventKey,
      kind: entry.kind,
      title: entry.title,
      message: entry.message,
      subject: entry.subject ?? null,
    });
    if (error && error.code !== "23505") {
      console.error("Portal notification was not recorded", error.message);
    }
  } catch (error) {
    console.error("Portal notification was not recorded", error);
  }
}

export async function recordInvoiceNotification(
  invoiceId: string,
  kind: "invoice_issued" | "invoice_paid" | "invoice_cancelled" | "invoice_draft",
) {
  const copy = {
    invoice_issued: {
      title: (number: string) => `Invoice ${number} was issued.`,
      message: (number: string) => `Invoice ${number} was issued successfully.`,
    },
    invoice_paid: {
      title: (number: string) => `Invoice ${number} was paid.`,
      message: (number: string) => `Invoice ${number} was paid successfully.`,
    },
    invoice_cancelled: {
      title: (number: string) => `Invoice ${number} was cancelled.`,
      message: (number: string) => `Invoice ${number} was cancelled.`,
    },
    invoice_draft: {
      title: (number: string) => `Invoice draft ${number} was saved.`,
      message: (number: string) => `Draft invoice ${number} was saved successfully.`,
    },
  }[kind];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("id", invoiceId)
      .maybeSingle();
    const number =
      typeof data?.invoice_number === "string" && data.invoice_number.trim()
        ? data.invoice_number.trim()
        : "this invoice";
    await recordPortalNotification({
      eventKey: eventKey(kind, invoiceId),
      kind,
      title: copy.title(number),
      message: copy.message(number),
      subject: number === "this invoice" ? null : number,
    });
  } catch (error) {
    console.error("Portal notification was not recorded", error);
  }
}

export async function recordBeneficiaryNotification(
  beneficiaryId: string,
  legalName: string,
  created: boolean,
) {
  const name = legalName.trim() || "Beneficiary";
  const kind: NotificationKind = created ? "beneficiary_created" : "beneficiary_updated";
  await recordPortalNotification({
    eventKey: eventKey(kind, beneficiaryId),
    kind,
    title: created ? `Beneficiary ${name} was added.` : `Beneficiary ${name} was updated.`,
    message: created
      ? `${name} was added successfully.`
      : `${name} was updated successfully.`,
    subject: name,
  });
}

export async function recordInvoiceEmailNotification(invoiceId: string, invoiceNumber: string, recipient: string) {
  const number = invoiceNumber.trim() || "this invoice";
  await recordPortalNotification({
    eventKey: eventKey("invoice_email", `${invoiceId}:${recipient}`),
    kind: "invoice_email",
    title: `Invoice ${number} was emailed.`,
    message: `Invoice ${number} was emailed to ${recipient}.`,
    subject: number === "this invoice" ? null : number,
  });
}

export async function recordInviteNotification(email: string, fullName: string) {
  const name = fullName.trim() || email;
  await recordPortalNotification({
    eventKey: eventKey("user_invited", email.toLowerCase()),
    kind: "user_invited",
    title: `Invitation sent to ${name}.`,
    message: `An invitation was sent to ${email}.`,
    subject: name,
  });
}

