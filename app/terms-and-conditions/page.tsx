import { LegalDocument } from "@/components/marketing/legal-document";
import { COMPANY_LEGAL_NAME } from "@/lib/marketing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms for using the iFranchise Invoice Portal.",
};

const sections = [
  {
    heading: "Portal access",
    body: [
      `The iFranchise Invoice Portal is operated by ${COMPANY_LEGAL_NAME}. It is provided for internal invoice work. Access is available only to people who have been invited.`,
    ],
  },
  {
    heading: "Authorized users",
    body: [
      "You may use the portal only with an account issued to you. Administrators decide who is invited and what role they have. You must not share your account or let another person use it.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "Use the portal for legitimate iFranchise invoice, payment, and record-keeping work. Do not attempt to access another person's records, disrupt the service, or use it for unlawful activity.",
    ],
  },
  {
    heading: "Invoice responsibility",
    body: [
      "The person who prepares an invoice is responsible for checking the client, amounts, tax treatment, and descriptions before it is issued. The portal calculates figures from the details entered. It does not replace a review of the invoice.",
    ],
  },
  {
    heading: "Payments and tax",
    body: [
      "Recording a payment in the portal updates the invoice balance. It does not, by itself, move money. GST, TDS, and other tax treatment must be confirmed by the people responsible for the invoice. The portal does not provide tax, legal, or accounting advice.",
    ],
  },
  {
    heading: "Account security",
    body: [
      "You are responsible for keeping your sign-in details confidential and for activity that takes place through your account. Tell an administrator if you believe the account has been used without permission.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      `The portal, its design, and the iFranchise name and logo are owned by ${COMPANY_LEGAL_NAME} or its licensors. Invoice content entered by users remains business information of the organization. You receive no ownership of the software by using it.`,
    ],
  },
  {
    heading: "Service availability",
    body: [
      "The portal is provided as an internal tool and may be updated, interrupted, or unavailable for maintenance or for reasons outside our control. Features can change as the product is improved.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      `To the extent permitted by law, ${COMPANY_LEGAL_NAME} is not liable for indirect or consequential loss, or for loss arising from incorrect invoice details, missed payments, or unavailability of the portal. Nothing in these terms limits liability that cannot legally be limited.`,
    ],
  },
  {
    heading: "Termination",
    body: [
      "An administrator may deactivate an account or withdraw access. You should stop using the portal when your access ends. Invoice records may be retained after access ends.",
    ],
  },
  {
    heading: "Changes",
    body: [
      "These terms may be updated. The date at the top of this page shows when they were last updated. Continued use of the portal after an update means you accept the revised terms.",
    ],
  },
  {
    heading: "Governing law",
    body: [
      "These terms are governed by the laws of India. The courts at Bengaluru, Karnataka, have jurisdiction, subject to any rights that cannot be waived.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      intro="These terms apply to invited use of the iFranchise Invoice Portal. If you do not agree with them, do not use the portal."
      sections={sections}
    />
  );
}
