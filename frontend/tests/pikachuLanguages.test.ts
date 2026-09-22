import test from "node:test";
import assert from "node:assert/strict";
import { duplicateQuantity, duplicateSlotId, duplicateVariant, hasCardLanguage, isAnniversaryPikachu, languageSlotId, languageVariant } from "../src/lib/pikachuLanguages.ts";
import type { MasterSetSlot } from "../src/types/master-set.ts";

const slot: MasterSetSlot = { id: "30th-025:normal", cardId: "30th-025", number: "025", name: "Pikachu", image: "", variant: "normal" };

test("extra copies remain independent of ownership, master-set totals, and the other language", () => {
  const quantities = { [slot.id]: 3, [languageSlotId(slot, "pt")]: 1, [languageSlotId(slot, "en")]: 1 };
  assert.equal(duplicateQuantity(quantities, slot, "pt"), 0);
  quantities[duplicateSlotId(slot, "pt")] = 2;
  quantities[duplicateSlotId(slot, "en")] = 4;
  assert.equal(duplicateQuantity(quantities, slot, "pt"), 2);
  assert.equal(duplicateQuantity(quantities, slot, "en"), 4);
  assert.equal(duplicateSlotId(slot, "pt"), `${slot.cardId}:${duplicateVariant(slot, "pt")}`);
  delete quantities[duplicateSlotId(slot, "pt")];
  assert.equal(duplicateQuantity(quantities, slot, "pt"), 0);
  assert.equal(duplicateQuantity(quantities, slot, "en"), 4);
  assert.equal(hasCardLanguage(quantities, slot, "pt"), true);
  assert.equal(hasCardLanguage(quantities, slot, "en"), true);
  assert.equal(quantities[slot.id], 3);
});

test("includes exactly the thirty anniversary Pikachus, excluding ex and other sets or variants", () => {
  const numbers = Array.from({ length: 158 }, (_, i) => i + 1).filter((number) => isAnniversaryPikachu({ ...slot, number: String(number) }));
  assert.equal(numbers.length, 30);
  assert.equal(numbers[0], 23);
  assert.equal(numbers.at(-1), 52);
  assert.equal(isAnniversaryPikachu({ ...slot, name: "Pikachu ex" }), false);
  assert.equal(isAnniversaryPikachu({ ...slot, cardId: "30th-c-025" }), false);
  assert.equal(isAnniversaryPikachu({ ...slot, cardId: "sv01-025" }), false);
  assert.equal(isAnniversaryPikachu({ ...slot, variant: "reverse" }), false);
});

test("existing quantities never imply a language; Portuguese and English remain independent", () => {
  const quantities: Record<string, number> = { [slot.id]: 2 };
  assert.equal(hasCardLanguage(quantities, slot, "pt"), false);
  assert.equal(hasCardLanguage(quantities, slot, "en"), false);
  quantities[languageSlotId(slot, "pt")] = 1;
  assert.equal(hasCardLanguage(quantities, slot, "pt"), true);
  assert.equal(hasCardLanguage(quantities, slot, "en"), false);
  quantities[languageSlotId(slot, "en")] = 1;
  assert.equal(hasCardLanguage(quantities, slot, "pt"), true);
  assert.equal(hasCardLanguage(quantities, slot, "en"), true);
  delete quantities[languageSlotId(slot, "pt")];
  assert.equal(hasCardLanguage(quantities, slot, "pt"), false);
  assert.equal(hasCardLanguage(quantities, slot, "en"), true);
  assert.equal(quantities[slot.id], 2);
});

test("language keys match the persisted progress row format", () => {
  for (const language of ["pt", "en"] as const) {
    assert.equal(languageSlotId(slot, language), `${slot.cardId}:${languageVariant(slot, language)}`);
    assert.notEqual(languageSlotId(slot, language), slot.id);
  }
});
