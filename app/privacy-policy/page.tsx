import { LegalDocument } from "@/components/marketing/legal-document";
import { COMPANY_LEGAL_NAME, CONTACT_EMAIL } from "@/lib/marketing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the iFranchise Invoice Portal handles account, invoice, and authentication information.",
};

const sections = [
  {
    heading: "Information collected",
    body: [
      `${COMPANY_LEGAL_NAME} operates the iFranchise Invoice Portal for invited internal users. The portal collects the information needed to run accounts, invoices, payments, and related records.`,
      "This includes information you or an administrator enter, information created as you use the portal, and technical information required to keep you signed in.",
    ],
  },
  {
    heading: "Account information",
    body: [
      "Account records can include your name, email address, role, and whether the account is active. Administrators create invitations and can update membership.",
    ],
  },
  {
    heading: "Invoice and business data",
    body: [
      "Invoice data can include invoice numbers, dates, beneficiary details, addresses, tax identifiers, line items, GST and TDS amounts, bank details selected for an invoice, notes, payment records, and files such as generated PDFs.",
      "This information is used to prepare, issue, email, and report on invoices, and to keep an activity history where the portal records one.",
    ],
  },
  {
    heading: "Authentication",
    body: [
      "Sign-in is handled through the portal's authentication service. That service processes your email address, password or invitation credentials, and session information so the portal can confirm who you are.",
    ],
  },
  {
    heading: "Cookies and local storage",
    body: [
      "The portal uses cookies to keep an authenticated session. It may also store an interface preference, such as light or dark appearance, in local storage on your device. These are used to operate the portal, not to run advertising.",
    ],
  },
  {
    heading: "Service providers",
    body: [
      "Authentication and database storage are provided through Supabase. Invoice and invitation emails are sent through Resend when email delivery is configured. These providers process the information required to perform those services.",
      `${CONTACT_EMAIL} is the contact for questions about this processing.`,
    ],
  },
  {
    heading: "Data security",
    body: [
      "Access to the portal requires an invited account. Operational records are limited to the signed-in member's own workspace, and administrators manage users separately. No external security certification is claimed on this page.",
    ],
  },
  {
    heading: "Retention",
    body: [
      "Account, invoice, payment, and audit information is kept for as long as it is needed to operate the portal, meet internal record-keeping needs, or resolve a dispute. Records may remain after an invoice is paid or an account is deactivated when the business record is still required.",
    ],
  },
  {
    heading: "Your requests",
    body: [
      "Invited users can ask to review or correct account details, or to ask about information held in the portal, by contacting the address below. Some invoice and audit records may need to be retained even when an account is closed.",
    ],
  },
  {
    heading: "Policy updates",
    body: [
      "This policy may be updated when the portal or the way information is handled changes. The date at the top of this page shows when it was last updated.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      intro="This policy describes how the iFranchise Invoice Portal handles information for invited users. It is an internal business tool, not a public consumer service."
      sections={sections}
    />
  );
}
