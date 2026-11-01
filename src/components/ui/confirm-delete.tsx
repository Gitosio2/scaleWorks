"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormDialog } from "./form-dialog";
import { TrashIconButton } from "./icon-actions";

/**
 * Trash icon that asks for confirmation before running a delete action.
 * Pass `blockedReason` to show the icon disabled, with the reason as tooltip.
 */
export function ConfirmDelete({
  label,
  title,
  message,
  action,
  blockedReason,
}: {
  label: string;
  title: string;
  message: string;
  action: () => Promise<void>;
  blockedReason?: string;
}) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <>
      <TrashIconButton label={label} blocked={blockedReason} onClick={() => setOpen(true)} />
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        submitLabel={tc("delete")}
        destructive
        action={() => action()}
      >
        <p className="text-ink-2">{message}</p>
      </FormDialog>
    </>
  );
}
