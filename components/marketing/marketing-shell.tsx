"use client";

import { BrandLockup } from "@/components/brand-logo";
import { CONTACT_EMAIL } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const PAGE_BG = "#f6f4ef";

function MarketingBrand({ priority = false, compact = false }: { priority?: boolean; compact?: boolean }) {
  return <BrandLockup size={compact ? 34 : 42} priority={priority} wordmarkClassName="dark:invert-0" />;
}

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/#faq", label: "FAQ" },
];

const FOOTER_LINKS = [
  ...NAV,
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
];

function SignInLink({ className }: { className?: string }) {
  return (
    <Link
      href="/auth/login"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-[#5B2BD6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4c22b8]",
        className,
      )}
    >
      Get Started
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="marketing-root min-h-screen overflow-x-clip text-slate-900" style={{ backgroundColor: PAGE_BG }}>
      <header
        className={cn("fixed inset-x-0 top-0 z-40 transition-colors duration-200", open && "border-b border-black/5")}
        style={{ backgroundColor: scrolled || open ? PAGE_BG : "transparent" }}
      >
        <div className="mx-auto grid h-[4.5rem] w-full max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="iFranchise home" className="min-w-0" onClick={() => setOpen(false)}>
            <MarketingBrand priority />
          </Link>
          <nav className="hidden items-center justify-center gap-8 text-sm text-slate-600 md:flex" aria-label="Page">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-slate-900">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-2">
            <SignInLink className="hidden md:inline-flex" />
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 md:hidden"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
        {open ? (
          <nav className="border-t border-slate-100 px-5 py-4 md:hidden" aria-label="Page">
            <div className="flex flex-col gap-3 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="py-1 text-slate-700" onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <SignInLink className="mt-2 w-fit" />
            </div>
          </nav>
        ) : null}
      </header>
      <main className="pt-[4.5rem]">{children}</main>
      <footer>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr]">
          <div>
            <MarketingBrand compact />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">
              The internal workspace for iFranchise invoices, payments, and records.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Pages</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li>
                <Link href="/" className="hover:text-slate-950">
                  Home
                </Link>
              </li>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-slate-950">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Portal</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li>
                <Link href="/auth/login" className="hover:text-slate-950">
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-slate-950">
                  Invoices
                </Link>
              </li>
              <li>
                <Link href="/#workflow" className="hover:text-slate-950">
                  Payments
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-slate-950">
                  Reports
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Connect</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-slate-950">
                  Contact
                </a>
              </li>
              {FOOTER_LINKS.filter((item) => item.href.startsWith("/privacy") || item.href.startsWith("/terms")).map(
                (item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:text-slate-950">
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
        <p className="pb-10 text-center text-sm text-slate-500">© 2026 iFranchise. All rights reserved.</p>
      </footer>
    </div>
  );
}
