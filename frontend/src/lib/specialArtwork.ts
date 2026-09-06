const SPECIAL_ARTWORK_RARITIES = new Set([
  "amazing rare",
  "art rare",
  "black white rare",
  "character rare",
  "character super rare",
  "classic collection",
  "full art",
  "full art trainer",
  "hyper rare",
  "illustration rare",
  "mega hyper rare",
  "radiant rare",
  "rare rainbow",
  "rare secret",
  "rare shining",
  "rare shiny",
  "rare shiny gx",
  "rare ultra",
  "secret rare",
  "shiny rare",
  "shiny rare v",
  "shiny rare vmax",
  "shiny ultra rare",
  "special art rare",
  "special illustration rare",
  "super rare",
  "ultra rare",
]);

function normalizeRarity(rarity: string) {
  return rarity.trim().replaceAll("_", " ").replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function isSpecialArtworkRarity(rarity?: string) {
  if (!rarity) return false;

  const normalized = normalizeRarity(rarity);

  // A API classifica as cartas das Trainer/Galarian Galleries com variações
  // como "Trainer Gallery Rare Holo", "... V" e "... VMAX".
  return normalized.startsWith("trainer gallery ") || SPECIAL_ARTWORK_RARITIES.has(normalized);
}
