import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareDuplicateArtwork, duplicateArtworkCategory } from "../src/lib/duplicateArtwork.ts";
import type { MasterSetSlot } from "../src/types/master-set.ts";

const catalog = JSON.parse(readFileSync(new URL("../src/data/anniversary-catalog.json", import.meta.url), "utf8")) as Record<string, MasterSetSlot[]>;

test("anniversary duplicates order classics, SAR, full art, then regular EX without grouping SAR as regular EX", () => {
  const card = (number: string) => catalog["30th"].find((slot) => slot.number === number)!;
  const regularEx = card("015");
  const sarEx = card("147");
  const fullArt = card("129");
  const futuristicEx = card("158");
  const classic = catalog["30th-c"][0];
  assert.equal(duplicateArtworkCategory(regularEx), "ex");
  assert.equal(duplicateArtworkCategory(sarEx), "sar");
  assert.equal(duplicateArtworkCategory(futuristicEx), "artwork");
  const sorted = [regularEx, futuristicEx, fullArt, sarEx, classic].sort(compareDuplicateArtwork);
  assert.deepEqual(sorted.map((slot) => slot.id), [classic, sarEx, fullArt, futuristicEx, regularEx].map((slot) => slot.id));
  // Applying category/language/search filters preserves the order passed to both exports.
  assert.deepEqual(sorted.filter((slot) => duplicateArtworkCategory(slot) === "artwork").map((slot) => slot.number), ["129", "158"]);
});
