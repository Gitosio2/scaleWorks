import { afterEach } from "vitest";

// Component tests opt in to jsdom per file; only those need React Testing
// Library, so the node tests do not load it. Unmount what each test rendered.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
}
