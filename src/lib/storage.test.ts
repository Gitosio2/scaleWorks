import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { deleteObjects, putObject } from "./storage";

describe("storage", () => {
  let server: ReturnType<typeof createServer>;
  let seen: IncomingHttpHeaders = {};

  beforeAll(async () => {
    server = createServer((req, res) => {
      seen = req.headers;
      req.resume();
      req.on("end", () => {
        // Deleting a key containing "broken" fails (403: aws4fetch retries 5xx with backoff); the rest succeeds.
        res.statusCode = req.method === "DELETE" && req.url?.includes("broken") ? 403 : 200;
        res.end();
      });
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

  it("putObject sends a Content-Length instead of a chunked body", async () => {
    await putObject("a/b.webp", new Uint8Array(1234), "image/webp");
    expect(seen["content-length"]).toBe("1234");
    expect(seen["transfer-encoding"]).toBeUndefined();
  });

  it("deleteObjects logs the keys that failed to delete, not just how many", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await deleteObjects(["ok/a.webp", "broken/b.webp", "ok/c.webp", "broken/d.webp"]);
    expect(log).toHaveBeenCalledTimes(1);
    const message = log.mock.calls[0].join(" ");
    expect(message).toContain("broken/b.webp");
    expect(message).toContain("broken/d.webp");
    expect(message).not.toContain("ok/a.webp");
    log.mockRestore();
  });

  it("deleteObjects stays silent when every delete works", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await deleteObjects(["ok/a.webp"]);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
