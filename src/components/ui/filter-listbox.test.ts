import { describe, expect, it } from "vitest";

// Server components render this client component on the server, where browser globals
// such as HTMLInputElement do not exist. Importing the module must not touch them.
describe("filter-listbox module", () => {
  it("can be evaluated on the server", async () => {
    const mod = await import("./filter-listbox");
    expect(typeof mod.FilterListbox).toBe("function");
  });
});
