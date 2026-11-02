import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { putObject } from "./storage";

describe("putObject", () => {
  let server: ReturnType<typeof createServer>;
  let seen: IncomingHttpHeaders = {};

  beforeAll(async () => {
    server = createServer((req, res) => {
      seen = req.headers;
      req.resume();
      req.on("end", () => res.end());
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    process.env.S3_ENDPOINT = `http://127.0.0.1:${port}`;
    process.env.S3_BUCKET = "bucket";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
  });

  afterAll(() => {
    server.close();
  });

  it("sends a Content-Length instead of a chunked body", async () => {
    await putObject("a/b.webp", new Uint8Array(1234), "image/webp");
    expect(seen["content-length"]).toBe("1234");
    expect(seen["transfer-encoding"]).toBeUndefined();
  });
});
