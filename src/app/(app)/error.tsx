"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cx, primaryButtonClass } from "@/components/ui/styles";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title="Something went wrong" />
      <Card>
        <p className="text-muted">An unexpected error occurred while loading this page.</p>
        <button
          type="button"
          onClick={() => retry()}
          className={cx(primaryButtonClass, "self-start")}
        >
          Try again
        </button>
      </Card>
    </>
  );
}
