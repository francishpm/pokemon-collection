import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTradeVariant } from "../src/lib/tradeVariant.ts";

test("optional trade variant trims labels and clears blank values", () => {
  assert.equal(normalizeTradeVariant("  Pokébola  "), "Pokébola");
  assert.equal(normalizeTradeVariant("Master Ball"), "Master Ball");
  for (const value of [undefined, null, "", "   "]) assert.equal(normalizeTradeVariant(value), null);
  assert.equal(normalizeTradeVariant("x".repeat(40)), "x".repeat(40));
  assert.throws(() => normalizeTradeVariant("x".repeat(41)), /40/);
});
