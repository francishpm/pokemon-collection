import type { PokemonCard } from "../types/pokemon-card";

export const stampedPromos: PokemonCard[] = [{
  id: "sv10-049-prerelease",
  name: "Gyarados da Misty",
  number: "049",
  imageReferenceLanguage: "EN",
  images: { small: "/cards/svp/049b.webp", large: "/cards/svp/049b.webp" },
  nationalPokedexNumbers: [130],
  rarity: "Promo", supertype: "Pokémon", subtypes: ["Stage 1"],
  set: { id: "sv10", name: "Rivais Predestinados — Pré-lançamento (selo)",
    series: "Escarlate e Violeta", printedTotal: 182 },
}, {
  id: "sv05-051-pokemon-day-2026",
  name: "Pikachu",
  number: "051",
  imageReferenceLanguage: "EN",
  images: { small: "/cards/pokemon-day/pikachu-2026.jpg", large: "/cards/pokemon-day/pikachu-2026.jpg" },
  nationalPokedexNumbers: [25],
  rarity: "Promo", supertype: "Pokémon", subtypes: ["Basic"],
  set: { id: "sv05", name: "Forças Temporais — Pokémon Day 2026 (selo)",
    series: "Escarlate e Violeta", printedTotal: 162 },
}];
