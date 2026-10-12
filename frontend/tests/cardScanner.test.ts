import test from "node:test";
import assert from "node:assert/strict";
import { parseScannedCard, scannedCardQuery, correctScannedName, selectScannedNumber } from "../src/lib/cardScanner.ts";

test("extracts title and printed number without treating HP or copyright as identity", () => {
  assert.deepEqual(parseScannedCard("BÁSICO\nPikachu PS 60", "©2024 Pokémon\n025 / 165"), { name: "Pikachu", number: "025/165" });
  assert.deepEqual(parseScannedCard("BASIC Charizard ex 330 HP", "©2023\n199/165"), { name: "Charizard ex", number: "199/165" });
  assert.equal(parseScannedCard("", "©2024 60 HP").number, "");
});

test("preserves special subsets and promo prefixes", () => {
  assert.equal(parseScannedCard("Pikachu", "TG01 / TG30").number, "TG01/TG30");
  assert.equal(parseScannedCard("Pikachu", "SWSH 020").number, "SWSH020");
});

test("supports corrected fields and number-only lookup; rejects malformed or empty hints", () => {
  assert.equal(scannedCardQuery(" Pikachu ", "025 / 165"), "Pikachu 025/165");
  assert.equal(scannedCardQuery("", "TG01/TG30"), "TG01");
  assert.equal(scannedCardQuery("Charizard ex", ""), "Charizard ex");
  assert.throws(() => scannedCardQuery("", ""));
  assert.throws(() => scannedCardQuery("Pikachu", "25/"));
});

test("ignores stage and evolution metadata above the title", () => {
  assert.equal(parseScannedCard("Basic Pokémon\nPikachu\n40 HP", "58/102").name, "Pikachu");
  assert.equal(parseScannedCard("Evolves from Charmeleon\nPut Charizard on top\nSTAGE 2\nCharizard", "4/102").name, "Charizard");
});

test("rejects the actual misleading readings reported on the Excadrill photo", () => {
  assert.deepEqual(parseScannedCard("AGIO", "1/4"), { name: "", number: "" });
  assert.deepEqual(parseScannedCard("2023 Pokémon Nintendo Creatures GA ME FRE", "74/41"), { name: "", number: "74/41" });
  assert.deepEqual(parseScannedCard("Excadrill PS 130", "H TEF PT 174/162 ©2024"), { name: "Excadrill", number: "174/162" });
});

test("ignores unreliable fraction fragments before a valid collector number", () => {
  assert.equal(parseScannedCard("Excadrill", "1/4 174 / 162").number, "174/162");
  assert.equal(parseScannedCard("", "0/162").number, "");
  assert.equal(parseScannedCard("", "4/102").number, "4/102");
});

test("corrects a unique close species spelling without guessing ambiguous names", () => {
  assert.equal(correctScannedName("Excadnill", ["Excadrill", "Pikachu"]), "Excadrill");
  assert.equal(correctScannedName("AGIO", ["Excadrill"]), "AGIO");
  assert.equal(correctScannedName("abcdef", ["abcdeg", "abcdeh"]), "abcdef");
});

test("a readable number is not discarded because the rest of the footer has low confidence", () => {
  assert.equal(selectScannedNumber([{ text: "flavor text", confidence: 3 }, { text: "212/182", confidence: 85 }]).number, "212/182");
});
test("uncertain number readings remain available for explicit confirmation", () => {
  const result = selectScannedNumber([{ text: "212/182", confidence: 24 }]);
  assert.equal(result.number, "");
  assert.deepEqual(result.candidates, [{ number: "212/182", confidence: 24 }]);
  assert.equal(selectScannedNumber([{ text: "1/4", confidence: 90 }]).candidates.length, 0);
});
test("conflicting close readings need confirmation, while a weak fragment does not override a strong number", () => {
  assert.equal(selectScannedNumber([{ text: "212/182", confidence: 80 }, { text: "212/183", confidence: 77 }]).number, "");
  assert.equal(selectScannedNumber([{ text: "212/182", confidence: 80 }, { text: "212/183", confidence: 15 }]).number, "212/182");
});
