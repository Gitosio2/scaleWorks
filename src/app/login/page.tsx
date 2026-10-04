"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import {
  cx,
  inputClass,
  labelClass,
  linkActionClass,
  primaryButtonClass,
} from "@/components/ui/styles";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } =
      mode === "signup"
        ? await authClient.signUp.email({
            email,
            password,
            name: String(form.get("name")),
          })
        : await authClient.signIn.email({ email, password });

    setPending(false);
    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas p-4">
      <Card as="div" className="w-full max-w-[400px] p-6!">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-[9px] bg-brand font-bold text-brand-fg"
            >
              S
            </span>
            <span className="text-lg font-bold tracking-tight">scaleWorks</span>
          </div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          {mode === "signup" && (
            <label className={labelClass}>
              Name
              <input
                name="name"
                placeholder="Name"
                required
                className={cx(inputClass, "text-base font-normal")}
              />
            </label>
          )}
          <label className={labelClass}>
            Email
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className={cx(inputClass, "text-base font-normal")}
            />
          </label>
          <label className={labelClass}>
            Password
            <input
              name="password"
              type="password"
              placeholder="Password (min. 8 characters)"
              required
              minLength={8}
              className={cx(inputClass, "text-base font-normal")}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className={cx(primaryButtonClass, "w-full")}
          >
            {mode === "signin" ? "Sign in" : "Sign up"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className={cx(linkActionClass, "justify-center")}
          >
            {mode === "signin"
              ? "No account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </Card>
    </main>
  );
}
