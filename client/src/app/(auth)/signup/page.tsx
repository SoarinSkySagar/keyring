import { SignupForm } from "@/components/auth/signup-form";

const googleEnabled = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export default function SignupPage() {
  return <SignupForm googleEnabled={googleEnabled} />;
}
