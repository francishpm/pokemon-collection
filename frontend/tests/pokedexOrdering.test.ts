import test from "node:test";
import assert from "node:assert/strict";
import { comparePokedexNumbers } from "../src/lib/pokedexOrdering.ts";

test("ordena pelo primeiro número da Pokédex Nacional", () => {
  const cards = [
    { name: "Miltank", numbers: [241] },
    { name: "Bulbasaur", numbers: [1] },
    { name: "Pikachu", numbers: [25] },
  ];

  cards.sort((a, b) => comparePokedexNumbers(a.numbers, b.numbers));

  assert.deepEqual(cards.map(({ name }) => name), ["Bulbasaur", "Pikachu", "Miltank"]);
});

test("coloca cartas sem número da Pokédex no final", () => {
  const cards = [undefined, [241], [1]];

  cards.sort(comparePokedexNumbers);

  assert.deepEqual(cards, [[1], [241], undefined]);
});
