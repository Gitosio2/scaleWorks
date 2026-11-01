import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { consumables } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { primaryButtonClass } from "@/components/ui/styles";
import { updateConsumable } from "../../actions";
import { ConsumableFields } from "../../consumable-fields";

export default async function EditConsumablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const t = await getTranslations("consumables");
  const tc = await getTranslations("common");
  const [consumable] = await db
    .select()
    .from(consumables)
    .where(and(eq(consumables.id, id), eq(consumables.userId, user.id)));
  if (!consumable) notFound();

  return (
    <>
      <BackLink href="/consumables">{t("back")}</BackLink>
      <PageHeader title={t("editTitle")} />
      <Card>
        <form action={updateConsumable.bind(null, id)} className="flex flex-col gap-3">
          <ConsumableFields defaults={consumable} />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            {tc("save")}
          </button>
        </form>
      </Card>
    </>
  );
}
