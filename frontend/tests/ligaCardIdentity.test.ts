import test from "node:test";
import assert from "node:assert/strict";
import { getLigaPokemonUrl, resolveLigaCardIdentity } from "../src/lib/ligaPokemon.ts";

test("Perfect Order links and price identities retain the 088 denominator", () => {
  for (const setName of ["Perfect Order", "Equilíbrio Perfeito"]) {
    for (const label of [undefined, "88", "088"]) {
      const url = new URL(getLigaPokemonUrl("Decidueye ex", "012", 88, undefined, label, setName));
      assert.equal(url.searchParams.get("card"), "Decidueye ex (012/088)");
      assert.equal(url.searchParams.get("num"), "012");
    }
    assert.equal(resolveLigaCardIdentity("Decidueye ex", "012", "88", undefined, setName).total, "088");
    const secret = new URL(getLigaPokemonUrl("Carta secreta", "123", 88, undefined, "88", setName));
    assert.equal(secret.searchParams.get("card"), "Carta secreta (123/088)");
  }
});

test("Teal Mask Ogerpon promo links use Liga's infinity denominator", () => {
  const expected = new URL("https://www.ligapokemon.com.br/?view=cards%2Fcard&tipo=1&card=Teal+Mask+Ogerpon+%28123%2F%E2%88%9E%29");
  for (const label of [undefined, "225", "∞"]) {
    const actual = new URL(getLigaPokemonUrl("Teal Mask Ogerpon", "123", 225, undefined, label, "SVP Black Star Promos"));
    assert.equal(actual.origin, expected.origin);
    assert.equal(actual.pathname, expected.pathname);
    assert.deepEqual([...actual.searchParams].sort(), [...expected.searchParams].sort());
  }
  assert.equal(resolveLigaCardIdentity("Teal Mask Ogerpon", "123", "225").total, "∞");
  assert.deepEqual(resolveLigaCardIdentity("Teal Mask Ogerpon ex", "123", "225"), { number: "123", total: "225", edition: undefined });
  assert.deepEqual(resolveLigaCardIdentity("Teal Mask Ogerpon", "024", "225"), { number: "024", total: "225", edition: undefined });
});

test("classic anniversary links use Liga numbers and edition", () => {
  for (const [name, number, expected] of [["Charizard", "001", "004"], ["Lugia", "029", "149"], ["Magikarp", "030", "203"], ["Magikarp", "203", "203"]]) {
    const url = new URL(getLigaPokemonUrl(name, number, 30, undefined, undefined, "30 Anos — Coleção Clássica"));
    assert.equal(url.searchParams.get("card"), `${name} (${expected}/30)`);
    assert.equal(url.searchParams.get("num"), expected);
    assert.equal(url.searchParams.get("ed"), "30C-C");
    assert.deepEqual(resolveLigaCardIdentity(name, number, "30", undefined, "30 Anos — Coleção Clássica"), { number: expected, total: "30", edition: "30C-C" });
  }
});

test("other editions retain their catalogue identity", () => {
  assert.deepEqual(resolveLigaCardIdentity("Charizard", "001", "30", undefined, "Outra coleção"), { number: "001", total: "30", edition: undefined });
  assert.deepEqual(resolveLigaCardIdentity("Magikarp", "030", "030", undefined, "Outra coleção"), { number: "030", total: "030", edition: undefined });
  assert.deepEqual(resolveLigaCardIdentity("Eevee", "001", "30", "30C-C"), { number: "001", total: "30", edition: "30C-C" });
});

test("classic Magikarp with an explicit Liga edition uses the printed number", () => {
  const actual = new URL(getLigaPokemonUrl("Magikarp", "030", 30, "30C-C"));
  const expected = new URL("https://www.ligapokemon.com.br/?view=cards/card&card=Magikarp%20(203%2F30)&ed=30C-C&num=203");
  assert.equal(actual.origin, expected.origin);
  assert.equal(actual.pathname, expected.pathname);
  assert.deepEqual([...actual.searchParams].sort(), [...expected.searchParams].sort());
});

test("classic Pikachu and Zekrom links match the Liga name, number and edition", () => {
  const expected = new URL("https://www.ligapokemon.com.br/?view=cards/card&card=Pikachu%20%26amp%3B%20Zekrom-GX%20(033%2F30)&ed=30C-C&num=033");
  for (const [name, number, edition, setName] of [
    ["Pikachu e Zekrom GX", "008", undefined, "30 Anos — Coleção Clássica"],
    ["Pikachu & Zekrom-GX", "033", "30C-C", undefined],
    ["Pikachu &amp; Zekrom-GX", "033", "30C-C", undefined],
  ]) {
    const actual = new URL(getLigaPokemonUrl(name!, number!, 30, edition, undefined, setName));
    assert.equal(actual.origin, expected.origin);
    assert.equal(actual.pathname, expected.pathname);
    assert.deepEqual([...actual.searchParams].sort(), [...expected.searchParams].sort());
  }
  assert.deepEqual(resolveLigaCardIdentity("Pikachu e Zekrom GX", "008", "30", undefined, "Outra coleção"), { number: "008", total: "30", edition: undefined });
});
