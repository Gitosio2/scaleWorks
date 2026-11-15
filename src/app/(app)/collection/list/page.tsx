import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";

// Placeholder for the text-only collection list (private for now).
export default async function CollectionListPage() {
  const t = await getTranslations("collection");
  const tn = await getTranslations("nav");

  return <PageHeader title={tn("collectionList")} subtitle={t("listSubtitle")} />;
}
