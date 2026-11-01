import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { modelImages, models } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getObject } from "@/lib/storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () => new Response("Not found", { status: 404 });

const contentTypeOf = (key: string) =>
  key.endsWith(".webp") ? "image/webp" : "image/jpeg";

/**
 * Serves a model photo from private storage. The bucket is never exposed: this
 * route allows a photo when its model is published and finished (the public
 * gallery), or when the signed-in user owns it. Anything else is a plain 404,
 * so the existence of private photos is not revealed.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; size: string }> },
) {
  const { id, size } = await params;
  if ((size !== "thumb" && size !== "full") || !UUID.test(id)) return notFound();

  const [image] = await db
    .select({
      key: modelImages.key,
      thumbKey: modelImages.thumbKey,
      ownerId: modelImages.userId,
      published: models.published,
      phase: models.phase,
    })
    .from(modelImages)
    .innerJoin(models, eq(models.id, modelImages.modelId))
    .where(eq(modelImages.id, id));
  if (!image) return notFound();

  const isPublic = image.published && image.phase === "finished";
  if (!isPublic) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.id !== image.ownerId) return notFound();
  }

  const key = size === "thumb" ? image.thumbKey : image.key;
  const body = await getObject(key);
  if (!body) return notFound();

  return new Response(body, {
    headers: {
      "Content-Type": contentTypeOf(key),
      "X-Content-Type-Options": "nosniff",
      // Public photos may be cached by the CDN for an hour; private ones never.
      "Cache-Control": isPublic
        ? "public, max-age=300, s-maxage=3600"
        : "private, no-store",
    },
  });
}
