import { cache } from "react";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { modelImages, models, user } from "@/db/schema";

/**
 * Whose models the public gallery shows. Sign-up is open, so the gallery must
 * not list every account's published models: it is tied to the account whose
 * email is in PORTFOLIO_EMAIL. Without it nothing is public (the safe default).
 */
export async function portfolioOwnerId() {
  const email = process.env.PORTFOLIO_EMAIL?.trim().toLowerCase();
  if (!email) return null;
  const [owner] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  return owner?.id ?? null;
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The public list: published, finished models that have at least one photo.
 * The sidebar and the grid both read it (cached per request). Only these
 * columns may be exposed: never prices, clients, payments, parts or consumables.
 * The outer id is written out because Drizzle drops table qualifiers inside
 * sql``, so a bare "id" would resolve to the subquery's own table.
 */
export const getPublicModels = cache(async () => {
  const ownerId = await portfolioOwnerId();
  if (!ownerId) return [];
  return db
    .select({
      id: models.id,
      brand: models.brand,
      name: models.name,
      type: models.type,
      company: models.company,
      coverId: sql<string | null>`(
        select ${modelImages.id} from ${modelImages}
        where ${modelImages.modelId} = ${sql.raw('"models"."id"')}
        order by ${modelImages.position}, ${modelImages.createdAt}
        limit 1
      )`,
    })
    .from(models)
    .where(
      and(
        eq(models.userId, ownerId),
        eq(models.published, true),
        eq(models.phase, "finished"),
        sql`exists (
          select 1 from ${modelImages}
          where ${modelImages.modelId} = ${sql.raw('"models"."id"')}
        )`,
      ),
    )
    .orderBy(asc(sql`lower(concat_ws(' ', ${models.brand}, ${models.name}))`), asc(models.id));
});
