"use client";

import { MarketingShell } from "@/components/marketing/marketing-shell";
import { CreateInvoiceMock, HeroShowcase, PaymentStatusMock, ReportBarsMock } from "@/components/marketing/product-mocks";
import { CONTACT_EMAIL } from "@/lib/marketing";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BarChart3, FileText, Lock, Shield, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

const faqs = [
  {
    question: "Is GST calculated automatically?",
    answer:
      "When GST is enabled, the invoice uses its GST rate. Supplies in the same state split into CGST and SGST. Supplies to another state use IGST. A TDS amount can be entered, and the balance due is the total after TDS.",
  },
  {
    question: "Can we record partial payments?",
    answer:
      "Yes. Record a partial or full amount against an issued invoice that still has a balance, along with the payment mode and an optional reference. The outstanding balance and status update from those payments.",
  },
  {
    question: "Can we download invoices as PDF?",
    answer:
      "Issued invoices can be downloaded as a professional A4 PDF. They can also be emailed to the beneficiary with that PDF attached.",
  },
  {
    question: "Who can access the portal?",
    answer:
      "Access is by invitation. Each person works in their own workspace. Administrators invite users, assign access, and can review the audit log. Sign-in is required, and this page does not claim an external security certification.",
  },
];

const steps = [
  {
    title: "Create",
    detail: "Add the beneficiary, prepare the invoice with GST and bank details, and issue the next financial-year number.",
  },
  {
    title: "Track",
    detail: "Record each payment and follow the outstanding balance until it is cleared.",
  },
  {
    title: "Report",
    detail: "Review GST, TDS, collections, and outstanding, then export the filtered period to PDF or Excel.",
  },
];

function Fade({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y: 12 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function WorkflowVisual({ step }: { step: number }) {
  if (step === 1) {
    return (
      <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.45)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Payments</p>
        <p className="mt-2 text-lg font-semibold text-slate-950">Follow the balance</p>
        <ul className="mt-4 space-y-2">
          {[
            ["Issued invoice", "Open"],
            ["Partial payment", "Recorded"],
            ["Reference", "Saved"],
            ["Balance due", "Updated"],
          ].map(([label, status]) => (
            <li key={label} className="flex items-center justify-between rounded-xl bg-[#f7f6fb] px-3 py-2.5 text-sm">
              <span className="font-medium text-slate-800">{label}</span>
              <span className="text-xs text-slate-500">{status}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.45)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Report</p>
        <p className="mt-2 text-lg font-semibold text-slate-950">Export the period</p>
        <ul className="mt-4 space-y-2 text-sm">
          {["Invoice value and GST", "TDS and amount paid", "Outstanding balance", "PDF or Excel"].map((item) => (
            <li key={item} className="rounded-xl border border-slate-100 px-3 py-2.5 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute left-6 top-6 h-40 w-[86%] rotate-[-8deg] rounded-3xl border border-slate-200/80 bg-white/80" />
      <div className="relative rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.45)]">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#5B2BD6] text-xs font-semibold text-white">1</span>
        <p className="mt-4 text-lg font-semibold text-slate-950">Create the invoice</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add the beneficiary, apply GST, and issue the next financial-year number.
        </p>
      </div>
    </div>
  );
}

function WorkflowSection() {
  const [active, setActive] = useState(0);

  return (
    <section id="workflow" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <Fade className="mx-auto max-w-2xl text-center">
          <Eyebrow>A direct path</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            A simple workflow for your invoice operations
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            From creating an invoice to tracking payments and exporting a report, everything stays in one place.
          </p>
        </Fade>
        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex min-h-[280px] items-center justify-center">
            <motion.div
              key={active}
              initial={{ opacity: 0.45, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-sm"
            >
              <WorkflowVisual step={active} />
            </motion.div>
          </div>
          <div className="space-y-3">
            {steps.map((step, index) => {
              const selected = active === index;
              return (
                <button
                  key={step.title}
                  type="button"
                  className={`w-full rounded-3xl px-6 py-5 text-left transition ${
                    selected ? "bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]" : "hover:bg-white/70"
                  }`}
                  aria-pressed={selected}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onClick={() => setActive(index)}
                >
                  <p className="text-xs font-medium text-slate-400">Step {index + 1}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5B2BD6]">
      <span className="size-1.5 rounded-full bg-[#5B2BD6]" aria-hidden />
      {children}
    </p>
  );
}

export function LandingPage() {
  const [open, setOpen] = useState<number | null>(null);
  const faqColumn = useRef<HTMLDivElement>(null);
  const [faqCardHeight, setFaqCardHeight] = useState<number | null>(null);

  useEffect(() => {
    const column = faqColumn.current;
    if (!column || open !== null) return;

    const measure = () => {
      if (window.innerWidth < 1024) {
        setFaqCardHeight(null);
        return;
      }
      setFaqCardHeight(column.getBoundingClientRect().height);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  return (
    <MarketingShell>
      <section className="relative -mt-[4.5rem] pt-[4.5rem]">
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-12 text-center sm:px-8 sm:pt-16">
          <Eyebrow>Internal invoice portal</Eyebrow>
          <h1 className="mx-auto mt-5 text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Send invoices <span className="text-[#5B2BD6]">faster</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Create professional invoices in seconds and spend less time on administration and more time growing your
            business.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5B2BD6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4c22b8]"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
            >
              Explore Features
            </a>
          </div>
          <HeroShowcase />
        </div>
      </section>

      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Fade className="mx-auto max-w-2xl text-center">
            <Eyebrow>Key features</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Everything you need to manage invoices
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              A simple invoice workspace for the iFranchise team, from the first draft through payment and export.
            </p>
          </Fade>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            <Fade>
              <article className="h-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-[#5B2BD6]">
                    <FileText className="size-4" />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-950">Create invoices</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Draft a GST invoice with financial-year numbering, tax calculation, payment terms, and a professional PDF.
                </p>
                <div className="mt-6">
                  <CreateInvoiceMock />
                </div>
              </article>
            </Fade>
            <Fade>
              <article className="h-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Wallet className="size-4" />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-950">Track payments</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Record what has been received, keep the outstanding balance, and see whether an invoice is partial or paid.
                </p>
                <div className="mt-6">
                  <PaymentStatusMock />
                </div>
              </article>
            </Fade>
            <Fade>
              <article className="h-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <BarChart3 className="size-4" />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-950">Reports and GST</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Review invoice value, GST, TDS, collections, and outstanding, then export the same filter to PDF or Excel.
                </p>
                <div className="mt-6">
                  <ReportBarsMock />
                </div>
              </article>
            </Fade>
          </div>
        </div>
      </section>

      <WorkflowSection />

      <section>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Fade className="mx-auto max-w-2xl text-center">
            <Eyebrow>Secure and controlled</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Built for internal use with complete control
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Your invoices, payments, and beneficiaries stay in the workspace of the person who created them.
            </p>
          </Fade>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Role-based access",
                detail: "Administrators invite people and assign access. Team members do not see one another's operational records.",
              },
              {
                icon: FileText,
                title: "Audit history",
                detail: "Administrators can review a record of invoice, payment, email, and membership activity.",
              },
              {
                icon: Lock,
                title: "Secure workspace",
                detail: "Sign-in is required. Company settings, numbering, and bank details stay shared across the organisation.",
              },
            ].map((item) => (
              <Fade key={item.title}>
                <article className="h-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.4)]">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-[#5B2BD6]">
                    <item.icon className="size-4" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </article>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.3fr_0.7fr]">
          <Fade>
            <div ref={faqColumn}>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Frequently asked questions</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Quick answers about GST, payments, PDFs, and who can use the portal.
            </p>
            <div className="mt-8 space-y-3">
              {faqs.map((item, index) => {
                const expanded = open === index;
                return (
                  <div key={item.question} className="rounded-2xl border border-slate-200/80 bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : index)}
                    >
                      <span className="font-medium text-slate-900">{item.question}</span>
                      <span className="text-slate-400" aria-hidden>
                        {expanded ? "–" : "+"}
                      </span>
                    </button>
                    {expanded ? <p className="px-5 pb-4 text-sm leading-7 text-slate-600">{item.answer}</p> : null}
                  </div>
                );
              })}
            </div>
            </div>
          </Fade>
          <Fade>
            <aside
              className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_16px_40px_-32px_rgba(15,23,42,0.4)]"
              style={faqCardHeight ? { height: faqCardHeight } : undefined}
            >
              <h3 className="text-lg font-semibold text-slate-950">Still have questions?</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
                Write to the iFranchise contact address and an administrator can help with portal access.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-[#5B2BD6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c22b8]"
              >
                Contact support
              </a>
            </aside>
          </Fade>
        </div>
      </section>

      <section className="pt-8 sm:pt-12">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <Fade>
            <div className="rounded-[2rem] bg-white px-6 py-14 text-center sm:px-12 sm:py-20">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">INVOICE PORTAL</p>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.1]">
                Ready to simplify invoice operations?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
                Access the iFranchise Invoice Portal and manage your invoicing workflow from one place.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-full bg-[#5B2BD6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4c22b8]"
                >
                  Get Started
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
                >
                  Explore Features
                </a>
              </div>
            </div>
          </Fade>
        </div>
      </section>
    </MarketingShell>
  );
}
