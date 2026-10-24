import test from "node:test";
import assert from "node:assert/strict";
import { parseDuplicatePrice, duplicatePriceLabel } from "../src/lib/duplicatePrices.ts";

test("prices accept decimal comma or point and distinguish empty from zero", () => {
  assert.equal(parseDuplicatePrice("12,50"), 12.5);
  assert.equal(parseDuplicatePrice("12.50"), 12.5);
  assert.equal(parseDuplicatePrice(" 12 "), 12);
  assert.equal(parseDuplicatePrice(""), null);
  assert.equal(parseDuplicatePrice("0"), 0);
  for (const invalid of ["-1", "abc", "1,234", "1.000,50", "Infinity", "99999999999999999999"]) {
    assert.throws(() => parseDuplicatePrice(invalid));
  }
  assert.equal(duplicatePriceLabel(null), "");
  assert.match(duplicatePriceLabel(12.5), /12,50.*\/ un\./);
  assert.match(duplicatePriceLabel(0), /0,00/);
});
