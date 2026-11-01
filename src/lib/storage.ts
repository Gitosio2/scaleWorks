import { AwsClient } from "aws4fetch";

// Object storage for model photos, over a generic S3-compatible API.
//
// Everything that touches storage goes through putObject, getObject and
// deleteObjects, and the database keeps only object keys, so the provider can
// change (Cloudflare R2 now; a self-hosted MinIO, or the local disk if the app
// moves to its own server) by replacing this module or just these variables:
//   S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET
// The bucket must stay private: images are served through /img/[id]/[size],
// which decides who may see each one.

function setup() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Image storage is not configured (S3_* environment variables)");
  }
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: process.env.S3_REGION ?? "auto",
  });
  return { client, base: `${endpoint.replace(/\/+$/, "")}/${bucket}` };
}

/** True when the S3_* variables are set, so the UI can say so instead of failing. */
export function storageConfigured() {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

const objectUrl = (base: string, key: string) =>
  `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  const { client, base } = setup();
  const res = await client.fetch(objectUrl(base, key), {
    method: "PUT",
    body: body as BodyInit,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status})`);
}

/** The object's stream, or null when it does not exist. */
export async function getObject(key: string) {
  const { client, base } = setup();
  const res = await client.fetch(objectUrl(base, key));
  if (res.status === 404) return null;
  if (!res.ok || !res.body) throw new Error(`Storage read failed (${res.status})`);
  return res.body;
}

/** Deletes objects one by one (S3 batch delete needs checksums); missing ones are fine. */
export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;
  const { client, base } = setup();
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      const res = await client.fetch(objectUrl(base, key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`Storage delete failed (${res.status})`);
    }),
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error(`Could not delete ${failed.length} of ${keys.length} stored objects`);
  }
}
