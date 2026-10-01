import { LoginShowcase } from "@/components/auth/login-showcase";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <main className="min-h-svh bg-white lg:grid lg:grid-cols-2 dark:bg-[hsl(224,67%,6%)]">
      <section className="flex min-h-svh items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          <LoginForm />
        </div>
      </section>
      <div className="hidden p-4 lg:block xl:p-5">
        <LoginShowcase />
      </div>
    </main>
  );
}
