"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title={t("title")} />
      <Card>
        <p className="text-muted">{t("description")}</p>
        <button
          type="button"
          onClick={() => retry()}
          className={cx(primaryButtonClass, "self-start")}
        >
          {t("retry")}
        </button>
      </Card>
    </>
  );
}
