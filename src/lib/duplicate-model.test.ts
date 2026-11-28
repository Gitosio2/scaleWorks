import { describe, expect, it } from "vitest";
import type { modelConsumables, models, parts } from "@/db/schema";
import {
  duplicateConsumableLinks,
  duplicateModelValues,
  duplicatePartValues,
} from "./duplicate-model";

const model: typeof models.$inferSelect = {
  id: "model-1",
  userId: "user-1",
  clientId: "client-1",
  brand: "Renault",
  name: "Magnum",
  type: "truck",
  tags: ["tipper"],
  company: "Transportes Pérez",
  year: 1998,
  priceCents: 45000,
  phase: "finished",
  requestedDate: "2026-01-10",
  estimatedDate: "2026-03-01",
  paymentStatus: "deposit_paid",
  depositCents: 10000,
  published: true,
  notes: "Weathered chassis",
  paymentHoldAt: new Date("2026-02-01T10:00:00Z"),
  createdAt: new Date("2026-01-01T10:00:00Z"),
};

const part: typeof parts.$inferSelect = {
  id: "part-1",
  userId: "user-1",
  modelId: "model-1",
  quoteId: null,
  brand: "Tamiya",
  reference: "X-1",
  description: "Black paint",
  priceCents: 350,
  store: "Hobby shop",
  url: "https://example.com/x1",
  status: "in_hand",
  paid: true,
  stockComponentId: null,
  quantity: null,
  deliveryId: "delivery-1",
};

describe("duplicateModelValues", () => {
  it("keeps the descriptive data, client and price under the new id and name", () => {
    expect(duplicateModelValues(model, "model-2", "Magnum (copy)")).toEqual({
      id: "model-2",
      userId: "user-1",
      clientId: "client-1",
      brand: "Renault",
      name: "Magnum (copy)",
      type: "truck",
      tags: ["tipper"],
      company: "Transportes Pérez",
      year: 1998,
      priceCents: 45000,
      notes: "Weathered chassis",
    });
  });

  it("leaves phase, payment, hold, dates and publication to their defaults", () => {
    const values = duplicateModelValues(model, "model-2", "Magnum (copy)");
    for (const key of [
      "phase",
      "paymentStatus",
      "depositCents",
      "paymentHoldAt",
      "requestedDate",
      "estimatedDate",
      "published",
      "createdAt",
    ]) {
      expect(values).not.toHaveProperty(key);
    }
  });
});

describe("duplicatePartValues", () => {
  it("restarts plain parts as to order, unpaid and outside any delivery", () => {
    expect(duplicatePartValues([part], "model-2")).toEqual([
      {
        userId: "user-1",
        modelId: "model-2",
        brand: "Tamiya",
        reference: "X-1",
        description: "Black paint",
        priceCents: 350,
        store: "Hobby shop",
        url: "https://example.com/x1",
        status: "to_order",
      },
    ]);
  });

  it("leaves out parts taken from stock", () => {
    const stockPart = { ...part, id: "part-2", stockComponentId: "stock-1", quantity: 2, priceCents: null };
    expect(duplicatePartValues([stockPart, part], "model-2")).toHaveLength(1);
    expect(duplicatePartValues([stockPart], "model-2")).toEqual([]);
  });
});

describe("duplicateConsumableLinks", () => {
  it("links the copy to the same consumables with the same amounts", () => {
    const links: (typeof modelConsumables.$inferSelect)[] = [
      { modelId: "model-1", consumableId: "c-1", quantity: "0.50000" },
      { modelId: "model-1", consumableId: "c-2", quantity: null },
    ];
    expect(duplicateConsumableLinks(links, "model-2")).toEqual([
      { modelId: "model-2", consumableId: "c-1", quantity: "0.50000" },
      { modelId: "model-2", consumableId: "c-2", quantity: null },
    ]);
  });
});
