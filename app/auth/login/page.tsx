import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import { LoginShowcase } from "@/components/auth/login-showcase";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <main className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#e7edf6] px-4 py-4 sm:px-8 dark:bg-[#050814]">
      <div className="absolute right-5 top-5 sm:right-7 sm:top-6">
        <AuthThemeToggle />
      </div>
      <div className="flex min-h-0 w-full items-center justify-center">
        <div className="grid max-h-full w-full max-w-[1080px] overflow-hidden rounded-[32px] bg-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.35)] lg:grid-cols-2 dark:border dark:border-[#1d4ed8]/40 dark:bg-[#0b1224] dark:shadow-[0_0_0_1px_rgba(37,99,235,0.18),0_40px_90px_-30px_rgba(37,99,235,0.45)]">
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
