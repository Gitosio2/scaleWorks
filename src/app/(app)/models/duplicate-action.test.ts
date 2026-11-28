import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { modelConsumables, models, parts } from "@/db/schema";

// Each select resolves with the next queued result, whatever chain builds it.
// The WHERE of every select is kept as SQL text and params, to check its filters.
const selectResults: unknown[][] = [];
const filters: { sql: string; params: unknown[] }[] = [];
const dialect = new PgDialect();
function query() {
  const result = selectResults.shift() ?? [];
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    where: (condition: SQL) => {
      const { sql, params } = dialect.sqlToQuery(condition);
      filters.push({ sql, params });
      return Promise.resolve(result);
    },
  };
  return chain;
}

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => query()),
    insert: vi.fn((table: unknown) => ({
      values: (values: unknown) => ({ table, values }),
    })),
    batch: vi.fn(async () => []),
  },
}));
vi.mock("@/lib/session", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string, values?: { name: string }) =>
    key === "copyName" ? `${values?.name} (copy)` : key,
  ),
}));
vi.mock("node:crypto", () => ({ randomUUID: () => "copy-1" }));

const { db } = await import("@/db");
const { duplicateModel } = await import("./actions");

const model = {
  id: "model-1",
  userId: "user-1",
  clientId: null,
  brand: "Liebherr",
  name: "LTM 1300",
  type: "crane",
  tags: [],
  company: null,
  year: null,
  priceCents: 90000,
  phase: "finished",
  requestedDate: "2026-01-10",
  estimatedDate: null,
  paymentStatus: "paid",
  depositCents: null,
  published: true,
  notes: null,
  paymentHoldAt: null,
  createdAt: new Date(),
};

const plainPart = {
  id: "part-1",
  userId: "user-1",
  modelId: "model-1",
  quoteId: null,
  brand: null,
  reference: null,
  description: "Decals",
  priceCents: 800,
  store: null,
  url: null,
  status: "in_hand",
  paid: true,
  stockComponentId: null,
  quantity: null,
  deliveryId: null,
};

beforeEach(() => {
  selectResults.length = 0;
  filters.length = 0;
  vi.mocked(db.batch).mockClear();
});

describe("duplicateModel", () => {
  it("inserts the copy with its parts and consumables in one batch and opens its edit page", async () => {
    selectResults.push(
      [model],
      [plainPart, { ...plainPart, id: "part-2", stockComponentId: "stock-1", quantity: 1 }],
      [{ link: { modelId: "model-1", consumableId: "c-1", quantity: "1.00000" } }],
    );

    await expect(duplicateModel("model-1")).rejects.toThrow("NEXT_REDIRECT /models/copy-1/edit");

    const [statements] = vi.mocked(db.batch).mock.calls[0] as unknown as [
      { table: unknown; values: unknown }[],
    ];
    expect(statements.map((s) => s.table)).toEqual([models, parts, modelConsumables]);
    expect(statements[0].values).toMatchObject({ id: "copy-1", name: "LTM 1300 (copy)", userId: "user-1" });
    expect(statements[0].values).not.toHaveProperty("phase");
    expect(statements[1].values).toEqual([
      expect.objectContaining({ modelId: "copy-1", description: "Decals", status: "to_order" }),
    ]);
    expect(statements[2].values).toEqual([
      { modelId: "copy-1", consumableId: "c-1", quantity: "1.00000" },
    ]);
  });

  it("inserts only the model when it has no parts or consumables", async () => {
    selectResults.push([model], [], []);

    await expect(duplicateModel("model-1")).rejects.toThrow("NEXT_REDIRECT");

    const [statements] = vi.mocked(db.batch).mock.calls[0] as unknown as [{ table: unknown }[]];
    expect(statements.map((s) => s.table)).toEqual([models]);
  });

  it("refuses a model that is not the user's", async () => {
    selectResults.push([]);

    await expect(duplicateModel("someone-else")).rejects.toThrow("modelNotFound");
    expect(db.batch).not.toHaveBeenCalled();
  });

  it("reads the model, its parts and its consumables only among the user's own rows", async () => {
    selectResults.push([model], [], []);

    await expect(duplicateModel("model-1")).rejects.toThrow("NEXT_REDIRECT");

    const ownedBy = (column: string) => ({
      sql: expect.stringContaining(column),
      params: expect.arrayContaining(["model-1", "user-1"]),
    });
    expect(filters).toEqual([
      ownedBy('"models"."user_id"'),
      ownedBy('"parts"."user_id"'),
      ownedBy('"consumables"."user_id"'),
    ]);
  });
});
