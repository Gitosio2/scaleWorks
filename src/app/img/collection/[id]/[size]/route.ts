import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { collectionItemImages } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canViewCollectionImage } from "@/lib/collection-image";
import { isUuid } from "@/lib/input";
import { getObject } from "@/lib/storage";

const notFound = () => new Response("Not found", { status: 404 });

const contentTypeOf = (key: string) =>
  key.endsWith(".webp") ? "image/webp" : "image/jpeg";

/**
 * Serves a collection photo from private storage, to its owner only. The proxy
 * lets /img/ through without a session, so this check is the only protection:
 * a visitor, another account and a missing photo all get the same plain 404, so
 * the existence of private photos is not revealed. Never cached publicly.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; size: string }> },
) {
  const { id, size } = await params;
  if ((size !== "thumb" && size !== "full") || !isUuid(id)) return notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return notFound();

  const [image] = await db
    .select({
      key: collectionItemImages.key,
      thumbKey: collectionItemImages.thumbKey,
      ownerId: collectionItemImages.userId,
    })
    .from(collectionItemImages)
    .where(eq(collectionItemImages.id, id));
  if (!image || !canViewCollectionImage(image.ownerId, session.user.id)) return notFound();

  const key = size === "thumb" ? image.thumbKey : image.key;
  const body = await getObject(key);
  if (!body) return notFound();

  return new Response(body, {
    headers: {
      "Content-Type": contentTypeOf(key),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
