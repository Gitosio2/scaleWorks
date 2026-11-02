import { describe, expect, it } from "vitest";
import type { ActionT, PaymentStatus } from "./labels";
import { derivePayment } from "./payments";

const t: ActionT = (key) => key;

const derive = (
  status: PaymentStatus,
  depositCents: number | null,
  priceCents: number | null,
) => derivePayment({ status, depositCents, priceCents }, t);

describe("derivePayment", () => {
  describe("without a deposit", () => {
    it.each(["none", "paid"] as const)("keeps status %s", (status) => {
      expect(derive(status, null, 10000)).toEqual({ status, depositCents: null });
    });

    it("treats a zero deposit as no deposit", () => {
      expect(derive("paid", 0, 10000)).toEqual({ status: "paid", depositCents: null });
      expect(derive("none", 0, null)).toEqual({ status: "none", depositCents: null });
    });

    it("rejects deposit_paid with nothing deposited", () => {
      expect(() => derive("deposit_paid", null, 10000)).toThrow("depositRequired");
      expect(() => derive("deposit_paid", 0, 10000)).toThrow("depositRequired");
    });
  });

  describe("with a deposit", () => {
    it("is deposit_paid when below the price", () => {
      expect(derive("none", 4000, 10000)).toEqual({
        status: "deposit_paid",
        depositCents: 4000,
      });
    });

    it("wins over the selected status", () => {
      expect(derive("paid", 4000, 10000)).toEqual({
        status: "deposit_paid",
        depositCents: 4000,
      });
    });

    it("is deposit_paid when the price is unknown", () => {
      expect(derive("none", 4000, null)).toEqual({
        status: "deposit_paid",
        depositCents: 4000,
      });
    });

    it("is paid, with the deposit cleared, when it equals the price", () => {
      expect(derive("deposit_paid", 10000, 10000)).toEqual({
        status: "paid",
        depositCents: null,
      });
      expect(derive("none", 10000, 10000)).toEqual({
        status: "paid",
        depositCents: null,
      });
    });

    it("accepts a deposit one cent below the price", () => {
      expect(derive("none", 9999, 10000)).toEqual({
        status: "deposit_paid",
        depositCents: 9999,
      });
    });

    it("rejects a deposit above the price", () => {
      expect(() => derive("none", 10001, 10000)).toThrow("depositExceedsPrice");
    });

    it("rejects a negative deposit regardless of the price", () => {
      expect(() => derive("none", -1, 10000)).toThrow("depositNotPositive");
      expect(() => derive("none", -1, null)).toThrow("depositNotPositive");
    });
  });
});
