import { getTranslations } from "next-intl/server";
import { BACKUP_TABLES, loadAll } from "@/lib/backup";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { linkActionClass, listItemClass, primaryButtonClass } from "@/components/ui/styles";

export default async function BackupPage() {
  const user = await requireUser();
  const t = await getTranslations("backup");
  const tables = await loadAll(user.id);
  const total = BACKUP_TABLES.reduce((sum, name) => sum + tables[name].length, 0);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card>
        <CardTitle>{t("fullTitle")}</CardTitle>
        <p className="text-muted">{t("fullHelp", { count: total })}</p>
        <a
          href="/backup/download?format=json"
          download
          className={`${primaryButtonClass} self-start`}
        >
          {t("downloadAll")}
        </a>
      </Card>

      <Card className="py-0!">
        <div className="pt-5">
          <CardTitle>{t("csvTitle")}</CardTitle>
          <p className="pt-1 text-muted">{t("csvHelp")}</p>
        </div>
        <ul className="flex flex-col">
          {BACKUP_TABLES.map((name) => (
            <li key={name} className={`${listItemClass} flex items-center justify-between gap-4`}>
              <div className="min-w-0">
                <p className="font-semibold">{t(`tables.${name}`)}</p>
                <p className="text-[13px] text-muted">{t("rows", { count: tables[name].length })}</p>
              </div>
              <a
                href={`/backup/download?format=csv&table=${name}`}
                download
                className={linkActionClass}
              >
                {t("downloadCsv")}
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>{t("noteTitle")}</CardTitle>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted">
          <li>{t("noteSensitive")}</li>
          <li>{t("notePhotos")}</li>
          <li>{t("noteExcluded")}</li>
        </ul>
      </Card>
    </>
  );
}
