import test from "node:test";
import assert from "node:assert/strict";
import { selectLowestPreferredLigaOffer } from "../src/lib/ligaPriceSelection.ts";

test("seleciona o menor preço entre lojas oficiais", () => {
  const selected = selectLowestPreferredLigaOffer([
    { offer: "oficial cara", price: 120, trusted: true },
    { offer: "não oficial", price: 70, trusted: false },
    { offer: "oficial barata", price: 90, trusted: true },
  ]);

  assert.deepEqual(selected, { offer: "oficial barata", price: 90, trusted: true });
});

test("usa o menor preço não oficial quando não há loja oficial", () => {
  const selected = selectLowestPreferredLigaOffer([
    { offer: "loja A", price: 80, trusted: false },
    { offer: "loja B", price: 65, trusted: false },
  ]);

  assert.deepEqual(selected, { offer: "loja B", price: 65, trusted: false });
});

test("ignora preços inválidos", () => {
  const selected = selectLowestPreferredLigaOffer([
    { offer: "zero", price: 0, trusted: true },
    { offer: "inválido", price: Number.NaN, trusted: true },
  ]);

  assert.equal(selected, null);
});
