import { LoginForm } from "@/components/auth/login-form";

const googleEnabled = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export default function LoginPage() {
  return <LoginForm googleEnabled={googleEnabled} />;
}
