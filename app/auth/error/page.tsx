import { AuthScreen } from "@/components/auth/auth-screen";
import Link from "next/link";

export default function Page() {
  return (
    <AuthScreen>
      <div className="grid gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">This link has expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link is invalid or has already been used. Request a new invitation or password reset to continue.
          </p>
        </div>
        <Link href="/auth/forgot-password" className="text-sm underline underline-offset-4">
          Reset your password
        </Link>
        <Link href="/auth/login" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthScreen>
  );
}
