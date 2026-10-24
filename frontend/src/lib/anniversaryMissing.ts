import type { MasterSetSlot } from "../types/master-set.ts";
import { duplicateArtworkCategory } from "./duplicateArtwork.ts";
import { isSpecialArtworkRarity } from "./specialArtwork.ts";

export const MISSING_CATEGORIES = {
  normal: "Normais", ex: "EX", artwork: "Full Art e artes alternativas", sar: "SAR", classic: "Clássicas",
} as const;
export type MissingCategory = keyof typeof MISSING_CATEGORIES;

export function missingCategory(slot: MasterSetSlot): MissingCategory {
  if (slot.cardId.startsWith("30th-c-")) return "classic";
  if (isSpecialArtworkRarity(slot.rarity) || slot.rarity === "Futuristic Rare" || /\bex$/i.test(slot.name.trim())) {
    return duplicateArtworkCategory(slot);
  }
  return "normal";
}

export function anniversaryMissingSlots(slots: MasterSetSlot[], quantities: Record<string, number>) {
  return slots.filter((slot) => (quantities[slot.id] ?? 0) <= 0);
}
