import { getTranslations } from "next-intl/server";
import { CreateModal } from "@/components/ui/create-modal";
import { PageHeader } from "@/components/ui/page-header";
import { createCollectionItem } from "../actions";
import { CollectionFields } from "../collection-fields";

// Placeholder for the collection photo gallery (private for now).
export default async function CollectionGalleryPage() {
  const t = await getTranslations("collection");
  const tn = await getTranslations("nav");

  return (
    <>
      <PageHeader title={tn("collectionGallery")} subtitle={t("gallerySubtitle")} />
      <CreateModal label={t("add")} title={t("add")} action={createCollectionItem}>
        <CollectionFields />
      </CreateModal>
    </>
  );
}
