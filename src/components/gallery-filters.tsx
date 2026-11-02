"use client";

import Form from "next/form";
import { secondaryButtonClass } from "@/components/ui/styles";

/**
 * Row of selects for the public gallery. It is a GET form, so the filters live
 * in the URL (shareable) and the page filters on the server; it is submitted as
 * soon as a select changes. The clear link is a plain link so the page loads afresh.
 */
export function GalleryFilters({
  action,
  clearLabel,
  showClear,
  children,
}: {
  action: string;
  clearLabel: string;
  showClear: boolean;
  children: React.ReactNode;
}) {
  return (
    <Form
      action={action}
      replace
      onChange={(e) => e.currentTarget.requestSubmit()}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap [&>label]:sm:min-w-48">
        {children}
      </div>
      {showClear && (
        <a href={action} className={secondaryButtonClass}>
          {clearLabel}
        </a>
      )}
    </Form>
  );
}
