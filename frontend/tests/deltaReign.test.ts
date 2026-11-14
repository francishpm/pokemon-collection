import test from "node:test";
import assert from "node:assert/strict";
import { deltaReignCards, searchDeltaReign } from "../src/lib/deltaReign.ts";
import { MASTER_SET_BY_ID } from "../src/lib/masterSetConfig.ts";

test("Delta Reign includes all 141 Portuguese cards with matching master set metadata", () => {
  assert.equal(deltaReignCards.length, 141);
  assert.equal(new Set(deltaReignCards.map(card => card.id)).size, 141);
  assert.equal(MASTER_SET_BY_ID.get("me06")?.printedCards, 103);
  for (const card of deltaReignCards) {
    assert.equal(card.language, "PT");
    assert.equal(card.set.name, "Reinado Delta");
    assert.equal(card.set.printedTotal, 103);
    assert.match(card.images.small, /^https:\/\/assets.tcgdex.net\/pt\/me\/me06\//);
  }
});

test("Delta Reign search supports set, name, printed numbers and stable IDs", () => {
  assert.equal(searchDeltaReign("Reinado Delta").length, 145);
  assert.equal(searchDeltaReign("Heracross 1/103")[0]?.id, "me06-001");
  assert.equal(searchDeltaReign("001/103")[0]?.id, "me06-001");
  assert.equal(searchDeltaReign("me06-001")[0]?.id, "me06-001");
  assert.equal(searchDeltaReign("001/102").length, 0);
  assert.equal(searchDeltaReign("").length, 0);
});

test("prerelease promos have separate identities, promo numbering and stamped images", () => {
  const cards = searchDeltaReign("Kommo-o");
  assert.deepEqual(cards.map(card => card.id), ["me06-075", "mep-114"]);
  const promo = searchDeltaReign("MEP 114")[0];
  assert.equal(promo.id, "mep-114");
  assert.equal(promo.set.printedTotalLabel, "∞");
  assert.equal(promo.images.small, "/cards/mep/114.png");
  assert.equal(searchDeltaReign("114/103")[0].id, "me06-114");
  assert.equal(searchDeltaReign("Kommo-o 114/∞")[0].id, "mep-114");
  assert.equal(searchDeltaReign("pré-lançamento").filter(card => card.set.id === "mep").length, 4);
});
