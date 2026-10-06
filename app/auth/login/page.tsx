import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import { LoginShowcase } from "@/components/auth/login-showcase";
import { BrandLockup } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function Page() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#f6f4ef] dark:bg-[#050814]">
      <header className="shrink-0">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="iFranchise home">
            <BrandLockup priority />
          </Link>
          <AuthThemeToggle />
        </div>
      </header>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center px-4 pb-4 sm:px-8">
        <div className="grid max-h-full w-full max-w-[1080px] overflow-hidden rounded-[32px] bg-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.35)] lg:grid-cols-2 dark:border dark:border-[#5B2BD6]/40 dark:bg-[#0b1224] dark:shadow-[0_0_0_1px_rgba(91,43,214,0.18),0_40px_90px_-30px_rgba(91,43,214,0.45)]">
        <div className="hidden p-3 lg:block xl:p-4">
          <LoginShowcase />
        </div>
        <section className="flex items-center justify-center px-6 py-6 sm:px-8 lg:px-8 lg:py-5 xl:px-10">
          <div className="w-full max-w-[400px]">
            <LoginForm />
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
