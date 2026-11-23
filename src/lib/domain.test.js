import { describe, expect, it } from "vitest";
import {
  idList,
  minor,
  money,
  orderTransitions,
  pageData,
  stringList,
} from "./domain";
describe("money and identifiers", () => {
  it("parses piastres without binary floating-point arithmetic", () => {
    expect(minor("125.50")).toBe(12550);
    expect(minor("0.29")).toBe(29);
    expect(minor("-2.05")).toBe(-205);
    expect(() => minor("1.001")).toThrow();
    expect(() => minor("1e3")).toThrow();
    expect(() => minor("9007199254740993")).toThrow();
  });
  it("distinguishes unavailable money from zero", () => {
    expect(money(null)).toBe("غير متاح");
    expect(money(0)).not.toBe("غير متاح");
    expect(money("12550")).toBe(money(12550));
  });
  it("preserves barcode leading zeros and rejects duplicate IDs", () => {
    expect(stringList("001234\n009876")).toEqual(["001234", "009876"]);
    expect(() => idList("1,1")).toThrow();
    expect(() => idList("1a")).toThrow();
  });
});
describe("backend pagination and fulfillment", () => {
  it("supports resource, raw and analytics envelopes", () => {
    expect(
      pageData({
        data: [{ id: 1 }],
        meta: { current_page: 2, last_page: 4, total: 70 },
      }).page,
    ).toBe(2);
    expect(pageData({ data: [], current_page: 3, last_page: 5 }).last).toBe(5);
    expect(
      pageData({ rows: [], meta: { page: 2, per_page: 30, total: 95 } }).last,
    ).toBe(4);
  });
  it("guards expired orders and fulfillment-specific transitions", () => {
    expect(
      orderTransitions({ status: "new", expires_at: "2000-01-01" }),
    ).toEqual([]);
    expect(
      orderTransitions({ status: "preparing", fulfillment: "pickup" }),
    ).toEqual(["ready_for_pickup", "cancelled"]);
    expect(
      orderTransitions({ status: "out_for_delivery", fulfillment: "delivery" }),
    ).toEqual(["delivered", "awaiting_return"]);
    expect(orderTransitions({ status: "delivered" })).toEqual([]);
  });
});
