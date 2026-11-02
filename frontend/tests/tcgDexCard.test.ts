import test from "node:test";
import assert from "node:assert/strict";
import { mapTcgDexCard, type TcgDexCard } from "../src/lib/tcgDexCard.ts";

const dunsparce: TcgDexCard = {
  id: "swsh12.5gg-GG23", localId: "GG23", name: "Dunsparce", category: "Pokemon", dexId: [206],
  set: { id: "swsh12.5gg", name: "Crown Zenith Galarian Gallery", cardCount: { official: 70 } },
};

test("Dunsparce remains searchable when TCGdex omits its image", () => {
  const card = mapTcgDexCard(dunsparce);
  assert.ok(card);
  assert.equal(card.name, "Dunsparce");
  assert.equal(card.number, "GG23");
  assert.equal(card.set.printedTotalLabel, "GG70");
  assert.equal(card.images.small, "https://images.pokemontcg.io/swsh12pt5gg/GG23.png");
  assert.equal(card.images.large, "https://images.pokemontcg.io/swsh12pt5gg/GG23_hires.png");
});

test("gallery fallback supports other cards while preserving existing images", () => {
  assert.equal(mapTcgDexCard({ ...dunsparce, localId: "GG7" })?.images.small, "https://images.pokemontcg.io/swsh12pt5gg/GG07.png");
  assert.equal(mapTcgDexCard({ ...dunsparce, image: "https://assets.tcgdex.net/card" })?.images.small, "https://assets.tcgdex.net/card/low.webp");
  assert.equal(mapTcgDexCard({ ...dunsparce, set: undefined }), null);
  assert.equal(mapTcgDexCard({ ...dunsparce, set: { ...dunsparce.set!, id: "other" } }), null);
});

test("Japanese Psyduck 199/193 remains a separate result when its catalogue image is absent", () => {
  const card = mapTcgDexCard({
    id: "M2a-199", localId: "199", name: "コダック", category: "Pokemon", dexId: [54],
    set: { id: "M2a", name: "MEGAドリームex", cardCount: { official: 193 } },
  });
  assert.ok(card);
  assert.equal(card.id, "M2a-199");
  assert.equal(card.number, "199");
  assert.equal(card.set.id, "M2a");
  assert.equal(card.set.printedTotal, 193);
  assert.deepEqual(card.nationalPokedexNumbers, [54]);
  assert.equal(card.images.small, "/cards/jp/M2a/199.jpg");
});

test("TG04/TG30 preserves all four editions when TCGdex omits their images", () => {
  for (const [setId, name] of [["swsh9tg", "Jolteon"], ["swsh10tg", "Frosmoth"], ["swsh11tg", "Chandelure"], ["swsh12tg", "Jynx"]]) {
    const card = mapTcgDexCard({
      id: `${setId}-TG04`, localId: "TG04", name,
      set: { id: setId, name: `${setId} Trainer Gallery`, cardCount: { official: 30 } },
    });
    assert.ok(card);
    assert.equal(card.name, name);
    assert.equal(card.set.printedTotalLabel, "TG30");
    assert.equal(card.images.small, `https://images.pokemontcg.io/${setId}/TG04.png`);
    assert.equal(card.images.large, `https://images.pokemontcg.io/${setId}/TG04_hires.png`);
  }
});
