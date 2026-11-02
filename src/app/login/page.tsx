import { LoginForm } from "./login-form";

// Read per request, so flipping DISABLE_SIGNUP does not need a rebuild.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm signupEnabled={process.env.DISABLE_SIGNUP !== "true"} />;
}
