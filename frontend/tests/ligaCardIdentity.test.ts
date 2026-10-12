import test from "node:test";
import assert from "node:assert/strict";
import { getLigaPokemonUrl, resolveLigaCardIdentity } from "../src/lib/ligaPokemon.ts";

test("classic anniversary links use Liga numbers and edition", () => {
  for (const [name, number, expected] of [["Charizard", "001", "004"], ["Lugia", "029", "149"]]) {
    const url = new URL(getLigaPokemonUrl(name, number, 30, undefined, undefined, "30 Anos — Coleção Clássica"));
    assert.equal(url.searchParams.get("card"), `${name} (${expected}/30)`);
    assert.equal(url.searchParams.get("num"), expected);
    assert.equal(url.searchParams.get("ed"), "30C-C");
    assert.deepEqual(resolveLigaCardIdentity(name, number, "30", undefined, "30 Anos — Coleção Clássica"), { number: expected, total: "30", edition: "30C-C" });
  }
});

test("other editions retain their catalogue identity", () => {
  assert.deepEqual(resolveLigaCardIdentity("Charizard", "001", "30", undefined, "Outra coleção"), { number: "001", total: "30", edition: undefined });
  assert.deepEqual(resolveLigaCardIdentity("Eevee", "001", "30", "30C-C"), { number: "001", total: "30", edition: "30C-C" });
});
