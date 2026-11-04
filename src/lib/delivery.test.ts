import { describe, expect, it } from "vitest";
import { deliveryState, newLineStatus } from "./delivery";

describe("deliveryState", () => {
  it("is empty without lines", () => {
    expect(deliveryState([])).toBe("empty");
  });
  it("is pending while nothing is in hand", () => {
    expect(deliveryState(["to_order", "ordered"])).toBe("pending");
  });
  it("is partial when only some lines are in hand", () => {
    expect(deliveryState(["in_hand", "ordered"])).toBe("partial");
  });
  it("is delivered when every line is in hand", () => {
    expect(deliveryState(["in_hand", "in_hand"])).toBe("delivered");
  });
});

describe("newLineStatus", () => {
  it("forces in hand on a delivered note", () => {
    expect(newLineStatus("delivered", "ordered")).toBe("in_hand");
  });
  it("keeps the requested status otherwise", () => {
    expect(newLineStatus("partial", "ordered")).toBe("ordered");
    expect(newLineStatus("empty", "ordered")).toBe("ordered");
    expect(newLineStatus("pending", "to_order")).toBe("to_order");
  });
});

describe("deliveryState with mixed and single lines", () => {
  it("handles a note with a single line", () => {
    expect(deliveryState(["ordered"])).toBe("pending");
    expect(deliveryState(["in_hand"])).toBe("delivered");
  });
  it("counts to_order together with in_hand as partial", () => {
    expect(deliveryState(["to_order", "in_hand"])).toBe("partial");
    expect(deliveryState(["to_order", "ordered", "in_hand"])).toBe("partial");
  });
  it("never forces a status on a to_order line unless delivered", () => {
    expect(newLineStatus("partial", "to_order")).toBe("to_order");
  });
});
