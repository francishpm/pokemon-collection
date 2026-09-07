import test from "node:test";
import assert from "node:assert/strict";
import { MASTER_SET_BY_ID, MASTER_SET_SERIES, masterSetLogo } from "../src/lib/masterSetConfig.ts";

test("disponibiliza a série Scarlet & Violet completa", () => {
  const scarletViolet = MASTER_SET_SERIES.find(({ id }) => id === "sv");

  assert.ok(scarletViolet);
  assert.equal(scarletViolet.sets.filter(({ special }) => !special).length, 16);
  assert.deepEqual(
    scarletViolet.sets.filter(({ special }) => special).map(({ id }) => id),
    ["svp", "sve"],
  );
  assert.ok(MASTER_SET_BY_ID.has("sv01"));
  assert.ok(MASTER_SET_BY_ID.has("sv10.5b"));
});

test("mantém as coleções Mega Evolution disponíveis", () => {
  assert.ok(MASTER_SET_BY_ID.has("me01"));
  assert.ok(MASTER_SET_BY_ID.has("mep"));
});

test("gera um logotipo para toda coleção configurada", () => {
  for (const series of MASTER_SET_SERIES) {
    for (const set of series.sets) {
      assert.match(masterSetLogo(series.id, set), /^https:\/\/assets\.tcgdex\.net\//);
    }
  }
});
