import test from "node:test";
import assert from "node:assert/strict";
import { speciesNameCandidates } from "../src/lib/speciesName.ts";

test("resolves trainer names, forms and translated species from legacy cards", () => {
  for (const [title, species] of [
    ["Castform Forma Ensolarada", "castform"],
    ["Reshiram do N", "reshiram"],
    ["Grimmsnarl ex da Marine", "grimmsnarl"],
    ["Morpeko da Marine", "morpeko"],
    ["Mãos Férreas ex", "iron hands"],
    ["Ogerpon Máscara Turquesa", "ogerpon"],
    ["Marnie's Morpeko", "morpeko"],
    ["Mega Charizard X ex", "charizard x"],
    ["Castform Sunny Form", "castform"],
  ]) assert.equal(speciesNameCandidates(title)[0], species, title);
});

test("keeps species identities distinct and avoids partial-name matching", () => {
  assert.deepEqual(speciesNameCandidates("Polteageist"), ["polteageist"]);
  assert.deepEqual(speciesNameCandidates("Poltchageist"), ["poltchageist"]);
  assert.deepEqual(speciesNameCandidates("Mr. Mime"), ["mr. mime"]);
  assert.deepEqual(speciesNameCandidates("Iron Hands ex"), ["iron hands", "iron hands ex"]);
});
