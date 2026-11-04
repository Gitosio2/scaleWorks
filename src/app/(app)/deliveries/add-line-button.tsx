"use client";

import { useState } from "react";
import { FormDialog } from "@/components/ui/form-dialog";
import { secondaryButtonClass } from "@/components/ui/styles";

/** Button that opens a modal with a create form for one kind of delivery line. */
export function AddLineButton({
  label,
  action,
  children,
}: {
  label: string;
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={secondaryButtonClass}>
        + {label}
      </button>
      <FormDialog open={open} onClose={() => setOpen(false)} title={label} submitLabel={label} action={action}>
        {children}
      </FormDialog>
    </>
  );
}
