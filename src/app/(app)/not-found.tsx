import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cx, primaryButtonClass } from "@/components/ui/styles";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <>
      <PageHeader title={t("notFoundTitle")} />
      <Card>
        <p className="text-muted">{t("notFoundDescription")}</p>
        <Link href="/" className={cx(primaryButtonClass, "self-start")}>
          {t("backHome")}
        </Link>
      </Card>
    </>
  );
}
