import test from "node:test";
import assert from "node:assert/strict";
import { getPrizePackCard, isPrizePackSearch, searchPrizePacks } from "../src/lib/prizePacks.ts";

test("Prize Pack catalogue covers all nine series with distinct stable printing IDs", () => {
  const cards = searchPrizePacks("");
  assert.equal(cards.length, 874);
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length);
  for (let series = 1; series <= 9; series++) {
    const found = searchPrizePacks(`série ${series}`);
    assert.ok(found.length > 0);
    assert.ok(found.every((card) => card.prizePack?.series.includes(series)));
  }
  assert.ok(cards.every((card) => card.language === "EN" && card.prizePack && !/^Code Card|^Play! Pokemon Prize Pack/i.test(card.name)));
});

test("Glaceon ex can be found by name, number, series or catalogue ID", () => {
  const card = searchPrizePacks("prize Glaceon ex 026/131")[0];
  assert.equal(card.id, "prize-pack-648647");
  assert.ok(searchPrizePacks("26/131").some((item) => item.id === card.id));
  assert.ok(searchPrizePacks("Glaceon ex série 7").some((item) => item.id === card.id));
  assert.equal(searchPrizePacks("Glaceon ex série 1").length, 0);
  assert.equal(getPrizePackCard(card.id)?.images.small, "https://tcgplayer-cdn.tcgplayer.com/product/648647_200w.jpg");
  assert.equal(getPrizePackCard("prize-pack-invalid"), null);
});

test("print variants remain separate and unavailable artwork is explicit", () => {
  const cards = searchPrizePacks("");
  assert.ok(cards.some((card) => card.prizePack?.variant === "Cosmos Holo"));
  assert.ok(cards.some((card) => card.prizePack?.variant === "Left Stamp"));
  assert.ok(cards.some((card) => card.prizePack?.variant === "Right Stamp"));
  const missing = cards.filter((card) => card.prizePack?.imageUnavailable);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].images.small, "/cards/prize-pack-no-image.svg");
  assert.equal(isPrizePackSearch("prize pack Glaceon"), true);
  assert.equal(isPrizePackSearch("Glaceon"), false);
});
