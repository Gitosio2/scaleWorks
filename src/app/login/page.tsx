"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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

  const field = "flex flex-col gap-1.5 text-[13px] font-semibold text-ink-2";
  const input =
    "min-h-11 rounded-[10px] border border-input-border bg-input px-3 text-base font-normal text-ink";

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas p-4">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-[400px] flex-col gap-4 rounded-[14px] border border-line bg-surface p-6"
      >
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
          <label className={field}>
            Name
            <input name="name" placeholder="Name" required className={input} />
          </label>
        )}
        <label className={field}>
          Email
          <input name="email" type="email" placeholder="Email" required className={input} />
        </label>
        <label className={field}>
          Password
          <input
            name="password"
            type="password"
            placeholder="Password (min. 8 characters)"
            required
            minLength={8}
            className={input}
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
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[10px] bg-brand px-[18px] font-semibold text-brand-fg hover:bg-brand-hover disabled:opacity-50"
        >
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="min-h-11 cursor-pointer text-sm font-semibold text-brand hover:text-brand-hover"
        >
          {mode === "signin"
            ? "No account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
