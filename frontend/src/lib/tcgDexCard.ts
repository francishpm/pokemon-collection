import type { PokemonCard } from "../types/pokemon-card";

export interface TcgDexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category?: string;
  stage?: string;
  suffix?: string;
  rarity?: string;
  dexId?: number[];
  set?: {
    id: string;
    name: string;
    cardCount: { official: number };
  };
}

// Verified images for catalogue entries that omit their artwork.
// Sources are recorded alongside the files in public/cards/jp.
const OFFICIAL_IMAGE_FALLBACKS: Record<string, string> = {
  "M2a-199": "/cards/jp/M2a/199.jpg",
};

const GALLERY_IMAGE_SETS: Record<string, { setId: string; prefix: string }> = {
  "swsh12.5gg": { setId: "swsh12pt5gg", prefix: "GG" },
  swsh9tg: { setId: "swsh9tg", prefix: "TG" },
  swsh10tg: { setId: "swsh10tg", prefix: "TG" },
  swsh11tg: { setId: "swsh11tg", prefix: "TG" },
  swsh12tg: { setId: "swsh12tg", prefix: "TG" },
};

export function mapTcgDexCard(card: TcgDexCard): PokemonCard | null {
  if (!card.set) return null;

  // TCGdex supplies gallery metadata without images for some cards. The
  // Pokémon TCG image catalogue covers Galarian and Trainer Galleries.
  const gallerySet = GALLERY_IMAGE_SETS[card.set.id];
  const galleryNumber = card.localId.match(/^(GG|TG)(\d{1,2})$/i);
  const fallbackNumber = galleryNumber && gallerySet?.prefix === galleryNumber[1].toUpperCase()
    ? `${gallerySet.prefix}${galleryNumber[2].padStart(2, "0")}` : undefined;
  const fallbackImage = gallerySet && fallbackNumber
    ? `https://images.pokemontcg.io/${gallerySet.setId}/${fallbackNumber}`
    : undefined;
  const images = card.image
    ? { small: `${card.image}/low.webp`, large: `${card.image}/high.webp` }
    : fallbackImage
      ? { small: `${fallbackImage}.png`, large: `${fallbackImage}_hires.png` }
      : OFFICIAL_IMAGE_FALLBACKS[card.id]
        ? { small: OFFICIAL_IMAGE_FALLBACKS[card.id], large: OFFICIAL_IMAGE_FALLBACKS[card.id] }
        : undefined;
  if (!images) return null;

  const galleryPrefix = card.localId.match(/^(GG|TG|RC)(?=\d)/i)?.[1]?.toUpperCase();
  const printedTotalLabel = galleryPrefix
    ? `${galleryPrefix}${card.set.cardCount.official}`
    : undefined;

  return {
    id: card.id,
    name: card.name,
    number: card.localId,
    images,
    nationalPokedexNumbers: card.dexId,
    rarity: card.rarity,
    supertype: card.category === "Pokemon" ? "Pokémon" : (card.category ?? "Pokémon"),
    subtypes: [card.stage, card.suffix].filter((value): value is string => Boolean(value)),
    set: {
      id: card.set.id,
      name: card.set.name,
      series: card.set.name,
      printedTotal: card.set.cardCount.official,
      printedTotalLabel,
    },
  };
}
