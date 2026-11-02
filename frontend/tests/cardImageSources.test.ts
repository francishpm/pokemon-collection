import test from "node:test";
import assert from "node:assert/strict";
import { cardImageSources } from "../src/lib/cardImageSources.ts";

test("catalogue images try thumbnails, same-origin proxy and English artwork", () => {
  const sources = cardImageSources(["https://assets.tcgdex.net/pt/me/me05/092/high.webp"]);
  assert.equal(sources[0], "https://assets.tcgdex.net/pt/me/me05/092/low.webp");
  assert.equal(sources[1], `/api/cards/image?url=${encodeURIComponent(sources[0])}`);
  assert.ok(sources.includes("https://assets.tcgdex.net/en/me/me05/092/low.webp"));
  assert.ok(sources.includes("https://assets.tcgdex.net/en/me/me05/092/high.webp"));
  assert.equal(new Set(sources).size, sources.length);
});

test("local images and unsupported providers are never sent to the proxy", () => {
  assert.deepEqual(cardImageSources(["", "/cards/jp/M2a/199.jpg", "/cards/jp/M2a/199.jpg"]), ["/cards/jp/M2a/199.jpg"]);
  assert.deepEqual(cardImageSources(["https://example.com/image.png"]), ["https://example.com/image.png"]);
});

test("Sword and Shield artwork has an independent image provider", () => {
  for (const set of ["swsh3", "swsh10"]) {
    const sources = cardImageSources([`https://assets.tcgdex.net/en/swsh/${set}/181/low.webp`]);
    const alternative = `https://images.pokemontcg.io/${set}/181.png`;
    assert.ok(sources.includes(alternative));
    assert.ok(sources.includes(`/api/cards/image?url=${encodeURIComponent(alternative)}`));
  }
  assert.ok(cardImageSources(["https://assets.tcgdex.net/en/swsh/swsh1/001/low.webp"]).includes("https://images.pokemontcg.io/swsh1/1.png"));
  assert.ok(!cardImageSources(["https://assets.tcgdex.net/ja/swsh/swsh3/181/low.webp"]).some((url) => url.startsWith("https://images.pokemontcg.io")));
});
