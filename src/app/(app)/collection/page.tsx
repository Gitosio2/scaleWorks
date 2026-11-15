import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";

// Placeholder for the personal collection (private for now).
export default async function CollectionPage() {
  const t = await getTranslations("collection");
  const tn = await getTranslations("nav");

  return <PageHeader title={tn("collection")} subtitle={t("subtitle")} />;
}
