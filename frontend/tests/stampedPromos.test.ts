import test from "node:test";
import assert from "node:assert/strict";
import { searchDeltaReign } from "../src/lib/deltaReign.ts";

test("Misty's Gyarados prerelease is searchable by Portuguese name and original printed number", () => {
  const promo = searchDeltaReign("gyarados da misty")[0];
  assert.equal(promo.id, "sv10-049-prerelease");
  assert.equal(promo.number, "049");
  assert.equal(promo.set.printedTotal, 182);
  assert.equal(promo.imageReferenceLanguage, "EN");
  assert.match(promo.set.name, /selo/);
  assert.ok(searchDeltaReign("049/182").some(card => card.id === promo.id));
  assert.equal(searchDeltaReign("049/103").some(card => card.id === promo.id), false);
  assert.equal(searchDeltaReign("Reinado Delta").some(card => card.id === promo.id), false);
});

test("Pokemon Day Pikachu keeps its stamped photo and identity separate from the base printing", () => {
  const id = "sv05-051-pokemon-day-2026";
  for (const term of ["Pikachu", "051/162", "pikachu (051/162", "pikachu (051/162)", "Pokemon Day 2026"]) {
    const promo = searchDeltaReign(term).find(card => card.id === id);
    assert.ok(promo, term);
    assert.equal(promo.number, "051");
    assert.equal(promo.set.printedTotal, 162);
    assert.equal(promo.imageReferenceLanguage, "EN");
    assert.equal(promo.images.small, "/cards/pokemon-day/pikachu-2026.jpg");
  }
  assert.equal(searchDeltaReign("051/182").some(card => card.id === id), false);
});
