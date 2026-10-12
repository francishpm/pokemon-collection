import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchNumber, searchNumberVariants } from "../src/lib/cardSearchNumber.ts";

test("busca números com e sem os zeros usados pela Liga", () => {
  assert.deepEqual(searchNumberVariants("066"), ["066", "66"]);
  assert.deepEqual(searchNumberVariants("66"), ["66", "066"]);
  assert.equal(normalizeSearchNumber("066"), normalizeSearchNumber("66"));
});

test("preserva prefixos e sufixos de cartas especiais", () => {
  assert.equal(normalizeSearchNumber("TG01"), "tg1");
  assert.equal(normalizeSearchNumber("066JP"), "66jp");
  assert.notEqual(normalizeSearchNumber("066JP"), normalizeSearchNumber("66"));
});
