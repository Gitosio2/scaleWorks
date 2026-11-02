"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";
import { cx } from "./styles";

/**
 * Submit button for a form with a server action. While the action runs it is
 * disabled (no double submit) and shows a spinner before its label. It reads the
 * status of the form it sits in, so it must be rendered inside that <form>.
 */
export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cx(className, "gap-2", pending && "cursor-wait")}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
