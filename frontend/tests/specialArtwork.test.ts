import test from "node:test";
import assert from "node:assert/strict";
import { isSpecialArtworkRarity } from "../src/lib/specialArtwork.ts";

test("inclui a Miltank GG24 e outras variações de Trainer Gallery", () => {
  assert.equal(isSpecialArtworkRarity("Trainer Gallery Rare Holo"), true);
  assert.equal(isSpecialArtworkRarity("Trainer Gallery Rare Holo VMAX"), true);
});

test("inclui os nomes de raridade usados pelas duas APIs", () => {
  assert.equal(isSpecialArtworkRarity("Rare Ultra"), true);
  assert.equal(isSpecialArtworkRarity("Ultra Rare"), true);
  assert.equal(isSpecialArtworkRarity("Rare Secret"), true);
  assert.equal(isSpecialArtworkRarity("Special Illustration Rare"), true);
  assert.equal(isSpecialArtworkRarity("Art Rare"), true);
});

test("não inclui cartas comuns nem holográficas convencionais", () => {
  assert.equal(isSpecialArtworkRarity("Common"), false);
  assert.equal(isSpecialArtworkRarity("Uncommon"), false);
  assert.equal(isSpecialArtworkRarity("Rare"), false);
  assert.equal(isSpecialArtworkRarity("Rare Holo"), false);
  assert.equal(isSpecialArtworkRarity(undefined), false);
});
