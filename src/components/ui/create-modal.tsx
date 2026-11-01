"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { primaryButtonClass, secondaryButtonClass } from "./styles";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryButtonClass}>
      {pending ? t("saving") : children}
    </button>
  );
}

/**
 * Floating action button (bottom-right) that opens a modal with a create form.
 * `action` is an existing server action; the modal closes once it succeeds and
 * the action's own revalidatePath refreshes the list.
 */
export function CreateModal({
  label,
  title,
  action,
  children,
}: {
  label: string;
  title: string;
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  function close() {
    setOpen(false);
    setError(null);
  }

  // Esc and form[method=dialog] close the <dialog> natively; keep state in sync.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const sync = () => {
      setOpen(false);
      setError(null);
    };
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="fixed right-4 bottom-4 z-30 inline-flex min-h-14 cursor-pointer items-center gap-2 rounded-full bg-brand px-5 font-semibold text-brand-fg shadow-lg hover:bg-brand-hover md:right-8 md:bottom-8"
      >
        <span aria-hidden className="text-2xl leading-none">+</span>
        <span>{label}</span>
      </button>

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
                <SubmitButton>{label}</SubmitButton>
              </div>
            </form>
          </div>
        )}
      </dialog>
    </>
  );
}
