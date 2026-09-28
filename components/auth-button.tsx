import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { hasEnvVars } from "@/lib/utils";

export async function AuthButton() {
  if (!hasEnvVars) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        {user.email}
        <LogoutButton />
      </div>
    );
  }

  return (
    <Button asChild size="sm" variant={"default"}>
      <Link href="/auth/login">Sign in</Link>
    </Button>
  );
}
