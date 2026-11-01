"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { dangerButtonClass, primaryButtonClass, secondaryButtonClass } from "./styles";

function SubmitButton({
  children,
  destructive,
}: {
  children: React.ReactNode;
  destructive: boolean;
}) {
  const t = useTranslations("common");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={destructive ? dangerButtonClass : primaryButtonClass}
    >
      {pending ? t("saving") : children}
    </button>
  );
}

/**
 * Modal <dialog> wrapping a form. `action` is an existing server action; the
 * dialog closes once it succeeds and the action's own revalidatePath refreshes
 * the page. Children render only while open, so inputs reset on every open.
 */
export function FormDialog({
  open,
  onClose,
  title,
  submitLabel,
  destructive = false,
  action,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  // Styles the submit button as a dangerous action (e.g. a delete confirmation).
  destructive?: boolean;
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  function close() {
    setError(null);
    onClose();
  }

  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("input, select, textarea")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Esc and form[method=dialog] close the <dialog> natively; keep state in sync.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const sync = () => closeRef.current();
    dialog.addEventListener("close", sync);
    return () => dialog.removeEventListener("close", sync);
  }, []);

  async function submit(formData: FormData) {
    try {
      await action(formData);
      close();
    } catch {
      setError(t("saveFailed"));
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={(e) => {
        // A click on the dialog element itself (not its content) hits the backdrop.
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[14px] border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-black/40"
    >
      {open && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-bold tracking-tight">
              {title}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              className="-mt-2 -mr-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] text-2xl leading-none text-muted hover:bg-canvas"
            >
              ×
            </button>
          </div>
          <form action={submit} className="flex flex-col gap-3">
            {children}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={close} className={secondaryButtonClass}>
                {t("cancel")}
              </button>
              <SubmitButton destructive={destructive}>{submitLabel}</SubmitButton>
            </div>
          </form>
        </div>
      )}
    </dialog>
  );
}
