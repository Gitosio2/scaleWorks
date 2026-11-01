"use client";

import { useState } from "react";
import { EditIconButton } from "./icon-actions";
import { FormDialog } from "./form-dialog";

/**
 * Pencil icon button that opens a modal with an edit form. `label` names the
 * trigger for assistive tech; `submitLabel` is the save button text.
 */
export function EditModal({
  label,
  title,
  submitLabel,
  action,
  children,
}: {
  label: string;
  title: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EditIconButton label={label} onClick={() => setOpen(true)} />
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        submitLabel={submitLabel}
        action={action}
      >
        {children}
      </FormDialog>
    </>
  );
}
