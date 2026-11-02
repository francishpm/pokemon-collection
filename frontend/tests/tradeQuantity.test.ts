import test from "node:test";
import assert from "node:assert/strict";
import { isValidTradeQuantity } from "../src/lib/tradeQuantity.ts";

test("trade quantities must be positive integers supported by the database", () => {
  for (const value of [1, 2, 50, 2147483647]) assert.equal(isValidTradeQuantity(value), true);
  for (const value of [0, -1, 1.5, NaN, Infinity, 2147483648]) assert.equal(isValidTradeQuantity(value), false);
});
