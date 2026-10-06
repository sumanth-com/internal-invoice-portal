import { LandingPage } from "@/components/marketing/landing-page";
import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "iFranchise Invoice Portal",
  description:
    "Create GST-compliant invoices, track payments, manage beneficiaries, and keep invoice operations organized in one secure workspace.",
};

export default function Home() {
  return <LandingPage />;
}
