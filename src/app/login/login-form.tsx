"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Spinner } from "@/components/ui/spinner";
import {
  cx,
  inputClass,
  labelClass,
  linkActionClass,
  primaryButtonClass,
} from "@/components/ui/styles";

export function LoginForm({ signupEnabled }: { signupEnabled: boolean }) {
  const t = useTranslations("login");
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
      setError(error.message ?? t("genericError"));
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
            <LanguageSwitcher className="order-last ml-auto" />
            <Brand />
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.9] tracking-tight">
              {mode === "signin" ? t("signIn") : t("createAccount")}
            </h1>
            <div aria-hidden className="hazard-stripe h-2 w-24 rounded-[2px]" />
          </div>
          {mode === "signup" && (
            <label className={labelClass}>
              {t("name")}
              <input
                name="name"
                placeholder={t("name")}
                required
                className={cx(inputClass, "text-base font-normal")}
              />
            </label>
          )}
          <label className={labelClass}>
            {t("email")}
            <input
              name="email"
              type="email"
              placeholder={t("email")}
              required
              className={cx(inputClass, "text-base font-normal")}
            />
          </label>
          <label className={labelClass}>
            {t("password")}
            <input
              name="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
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
            aria-busy={pending}
            className={cx(primaryButtonClass, "w-full gap-2", pending && "cursor-wait")}
          >
            {pending && <Spinner />}
            {mode === "signin" ? t("signIn") : t("signUp")}
          </button>
          {signupEnabled && (
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className={cx(linkActionClass, "justify-center")}
            >
              {mode === "signin" ? t("noAccount") : t("haveAccount")}
            </button>
          )}
        </form>
      </Card>
    </main>
  );
}
