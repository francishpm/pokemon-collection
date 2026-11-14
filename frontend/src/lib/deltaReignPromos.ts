import type { PokemonCard } from "../types/pokemon-card";

export const deltaReignPromos: PokemonCard[] = [
  ["111", "Masquerain", 284],
  ["112", "Magmortar", 467],
  ["113", "Enamorus", 905],
  ["114", "Kommo-o", 784],
].map(([number, name, dex]) => ({
  id: `mep-${number}`, name: String(name), number: String(number), language: "PT",
  images: { small: `/cards/mep/${number}.png`, large: `/cards/mep/${number}.png` },
  nationalPokedexNumbers: [Number(dex)], rarity: "Promo", supertype: "Pokémon", subtypes: [],
  set: { id: "mep", name: "Promos Megaevolução — Pré-lançamento Reinado Delta",
    series: "Megaevolução", printedTotal: 0, printedTotalLabel: "∞", ligaEdition: "MEP" },
}));

export const deltaReignPromoSlots = deltaReignPromos.map(card => ({
  id: `${card.id}:holo`, cardId: card.id, number: card.number, name: card.name,
  image: card.images.small, rarity: "Promo", variant: "holo" as const,
}));
