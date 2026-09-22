import type { MasterSetSlot } from "../types/master-set.ts";

export const CARD_LANGUAGES = { pt: "Português", en: "Inglês" } as const;
export type CardLanguage = keyof typeof CARD_LANGUAGES;

export function isAnniversaryPikachu(slot: MasterSetSlot) {
  return /^30th-\d+$/.test(slot.cardId) && slot.variant === "normal"
    && slot.name === "Pikachu" && Number(slot.number) >= 23 && Number(slot.number) <= 52;
}

// Language ownership is stored in distinct progress rows. The existing unqualified
// variant remains the master-set quantity, so no language is inferred from old data.
// master_set_progress.variant is free text (unlike master_set_catalog.variant).
export function languageVariant(slot: MasterSetSlot, language: CardLanguage) {
  return `${slot.variant}:${language}`;
}

export function languageSlotId(slot: MasterSetSlot, language: CardLanguage) {
  return `${slot.cardId}:${languageVariant(slot, language)}`;
}

export function hasCardLanguage(quantities: Record<string, number>, slot: MasterSetSlot, language: CardLanguage) {
  return (quantities[languageSlotId(slot, language)] ?? 0) > 0;
}

// Extra copies are independent of the copy kept in the collection.
export function duplicateVariant(slot: MasterSetSlot, language: CardLanguage) {
  return `${languageVariant(slot, language)}:duplicates`;
}

export function duplicateSlotId(slot: MasterSetSlot, language: CardLanguage) {
  return `${slot.cardId}:${duplicateVariant(slot, language)}`;
}

export function duplicateQuantity(quantities: Record<string, number>, slot: MasterSetSlot, language: CardLanguage) {
  return Math.max(0, quantities[duplicateSlotId(slot, language)] ?? 0);
}
