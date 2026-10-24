import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { missingCategory, anniversaryMissingSlots, MISSING_CATEGORIES } from "../src/lib/anniversaryMissing.ts";
import type { MasterSetSlot } from "../src/types/master-set.ts";

const catalog = JSON.parse(readFileSync(new URL("../src/data/anniversary-catalog.json", import.meta.url), "utf8")) as Record<string, MasterSetSlot[]>;

test("all 188 anniversary cards have a category, including normal Pikachus and classics", () => {
  const slots = [...catalog["30th"], ...catalog["30th-c"]];
  assert.equal(slots.length, 188);
  assert.equal(new Set(slots.map((slot) => slot.id)).size, 188);
  for (const slot of slots) assert.ok(missingCategory(slot) in MISSING_CATEGORIES);
  const card = (number: string) => catalog["30th"].find((slot) => slot.number === number)!;
  assert.equal(missingCategory(card("001")), "normal");
  assert.equal(missingCategory(card("023")), "normal");
  assert.equal(missingCategory(card("015")), "ex");
  assert.equal(missingCategory(card("129")), "artwork");
  assert.equal(missingCategory(card("147")), "sar");
  assert.equal(missingCategory(card("158")), "artwork");
  assert.equal(slots.filter((slot) => missingCategory(slot) === "classic").length, 30);
});

test("missing list follows ownership in both master sets and ignores manual marks and duplicates", () => {
  const slots = [...catalog["30th"], ...catalog["30th-c"]];
  const main = catalog["30th"][0];
  const classic = catalog["30th-c"][0];
  const quantities: Record<string, number> = {
    [main.id]: 1, [classic.id]: 2,
    [main.id + ":pt:missing"]: 1,
    [slots[1].id + ":pt:duplicates"]: 3,
    [slots[2].id + ":pt"]: 1,
  };
  const missing = anniversaryMissingSlots(slots, quantities);
  assert.equal(missing.length, 186);
  assert.ok(!missing.includes(main));
  assert.ok(!missing.includes(classic));
  assert.ok(missing.includes(slots[1]));
  assert.ok(missing.includes(slots[2]));
  quantities[main.id] = 0;
  quantities[classic.id] = 0;
  assert.equal(anniversaryMissingSlots(slots, quantities).length, 188);
  for (const slot of slots) quantities[slot.id] = 1;
  assert.deepEqual(anniversaryMissingSlots(slots, quantities), []);
});
