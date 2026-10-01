import { AuthScreen } from "@/components/auth/auth-screen";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <AuthScreen>
      <LoginForm />
    </AuthScreen>
  );
}
