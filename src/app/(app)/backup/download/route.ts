import { headers } from "next/headers";
import { resolveLocale } from "@/i18n/request";
import { auth } from "@/lib/auth";
import {
  BACKUP_TABLES,
  columnsOf,
  isBackupTable,
  loadAll,
  loadTable,
  toCsv,
} from "@/lib/backup";
import { SITE_NAME } from "@/lib/site";

const slug = SITE_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function download(body: string, filename: string, contentType: string) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Personal data: never cached by the browser or any shared cache.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * GET /backup/download?format=json            every table in one file
 * GET /backup/download?format=csv&table=models one table, for a spreadsheet
 *
 * Only the signed-in account's own data is read, and never the auth tables.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;
  const format = params.get("format");
  const day = new Date().toISOString().slice(0, 10);
  const userId = session.user.id;

  if (format === "json") {
    const tables = await loadAll(userId);
    const body = JSON.stringify(
      {
        app: slug,
        version: 1,
        exportedAt: new Date().toISOString(),
        counts: Object.fromEntries(BACKUP_TABLES.map((t) => [t, tables[t].length])),
        tables,
      },
      null,
      2,
    );
    return download(body, `${slug}-backup-${day}.json`, "application/json; charset=utf-8");
  }

  if (format === "csv") {
    const table = params.get("table");
    if (!isBackupTable(table)) return new Response("Unknown table", { status: 400 });
    const rows = await loadTable(table, userId);
    const body = toCsv(rows, columnsOf(table), await resolveLocale());
    return download(body, `${slug}-${table}-${day}.csv`, "text/csv; charset=utf-8");
  }

  return new Response("Unknown format", { status: 400 });
}
