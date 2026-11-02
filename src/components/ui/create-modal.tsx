"use client";

import { useState } from "react";
import { FormDialog } from "./form-dialog";

/**
 * Floating action button (bottom-right) that opens a modal with a create form.
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={label}
        className="fixed right-4 bottom-4 z-30 inline-flex size-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand font-semibold text-brand-fg shadow-lg hover:bg-brand-hover md:right-8 md:bottom-8 md:size-auto md:min-h-14 md:px-5"
      >
        <span aria-hidden className="text-2xl leading-none">+</span>
        <span className="hidden md:inline">{label}</span>
      </button>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        submitLabel={label}
        action={action}
      >
        {children}
      </FormDialog>
    </>
  );
}
