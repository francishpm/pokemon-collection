import type { MasterSetSlot } from "../types/master-set.ts";

export type DuplicateArtworkCategory = "classic" | "sar" | "artwork" | "ex";

export function duplicateArtworkCategory(slot: MasterSetSlot): DuplicateArtworkCategory {
  if (slot.cardId.startsWith("30th-c-")) return "classic";
  if (/^(special illustration rare|special art rare|sar)$/i.test(slot.rarity?.trim() ?? "")) return "sar";
  if (/\bex$/i.test(slot.name.trim()) && /^double rare$/i.test(slot.rarity?.trim() ?? "")) return "ex";
  return "artwork";
}

export function compareDuplicateArtwork(a: MasterSetSlot, b: MasterSetSlot) {
  const rank = { classic: 0, sar: 1, artwork: 2, ex: 3 };
  return rank[duplicateArtworkCategory(a)] - rank[duplicateArtworkCategory(b)]
    || a.number.localeCompare(b.number, "pt-BR", { numeric: true })
    || a.id.localeCompare(b.id);
}
