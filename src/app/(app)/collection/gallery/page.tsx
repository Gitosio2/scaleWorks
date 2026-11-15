import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";

// Placeholder for the collection photo gallery (private for now).
export default async function CollectionGalleryPage() {
  const t = await getTranslations("collection");
  const tn = await getTranslations("nav");

  return <PageHeader title={tn("collectionGallery")} subtitle={t("gallerySubtitle")} />;
}
