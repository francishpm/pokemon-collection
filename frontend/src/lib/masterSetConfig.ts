export interface MasterSetDefinition {
  id: string;
  name: string;
  cards: number;
  printedCards?: number;
  logo?: string;
  special?: boolean;
}

export interface MasterSetSeriesDefinition {
  id: string;
  name: string;
  logo: string;
  sets: MasterSetDefinition[];
}

const assetLogo = (language: "pt" | "en", seriesId: string, setId: string) =>
  `https://assets.tcgdex.net/${language}/${seriesId}/${setId}/logo.webp`;

export const MASTER_SET_SERIES: MasterSetSeriesDefinition[] = [
  {
    id: "me",
    name: "Mega Evolution",
    logo: assetLogo("pt", "me", "me01"),
    sets: [
      { id: "me05", name: "Escuridão Absoluta", cards: 120, printedCards: 84, logo: assetLogo("en", "me", "me05") },
      { id: "me04", name: "Caos Ascendente", cards: 122, printedCards: 86 },
      { id: "me03", name: "Equilíbrio Perfeito", cards: 124, printedCards: 88 },
      { id: "me02.5", name: "Heróis Excelsos", cards: 295, printedCards: 217 },
      { id: "me02", name: "Fogo Fantasmagórico", cards: 130, printedCards: 94 },
      { id: "me01", name: "Megaevolução", cards: 188, printedCards: 132 },
      { id: "mep", name: "Promos Mega Evolution", cards: 110, special: true, logo: assetLogo("pt", "me", "me01") },
    ],
  },
  {
    id: "sv",
    name: "Escarlate e Violeta",
    logo: assetLogo("pt", "sv", "sv01"),
    sets: [
      { id: "sv10.5b", name: "Raio Preto", cards: 172, printedCards: 86, logo: assetLogo("en", "sv", "sv10.5b") },
      { id: "sv10.5w", name: "Fogo Branco", cards: 173, printedCards: 86, logo: assetLogo("en", "sv", "sv10.5w") },
      { id: "sv10", name: "Rivais Predestinados", cards: 244, printedCards: 182 },
      { id: "sv09", name: "Amigos de Jornada", cards: 190, printedCards: 159 },
      { id: "sv08.5", name: "Evoluções Prismáticas", cards: 180, printedCards: 131 },
      { id: "sv08", name: "Fagulhas Impetuosas", cards: 252, printedCards: 191, logo: assetLogo("en", "sv", "sv08") },
      { id: "sv07", name: "Coroa Estelar", cards: 175, printedCards: 142, logo: assetLogo("en", "sv", "sv07") },
      { id: "sv06.5", name: "Fábulas Nebulosas", cards: 99, printedCards: 64 },
      { id: "sv06", name: "Máscaras do Crepúsculo", cards: 226, printedCards: 167 },
      { id: "sv05", name: "Forças Temporais", cards: 218, printedCards: 162 },
      { id: "sv04.5", name: "Destinos de Paldea", cards: 245, printedCards: 91 },
      { id: "sv04", name: "Fenda Paradoxal", cards: 266, printedCards: 182 },
      { id: "sv03.5", name: "151", cards: 207, printedCards: 165 },
      { id: "sv03", name: "Obsidiana em Chamas", cards: 230, printedCards: 197 },
      { id: "sv02", name: "Evoluções em Paldea", cards: 279, printedCards: 193 },
      { id: "sv01", name: "Escarlate e Violeta", cards: 258, printedCards: 198 },
      { id: "svp", name: "SVP Black Star Promos", cards: 225, special: true, logo: assetLogo("pt", "sv", "sv01") },
      { id: "sve", name: "Escarlate e Violeta Energia", cards: 24, printedCards: 16, special: true, logo: assetLogo("pt", "sv", "sv01") },
    ],
  },
];

export const MASTER_SET_BY_ID = new Map(
  MASTER_SET_SERIES.flatMap((series) => series.sets.map((set) => [set.id, { ...set, seriesId: series.id }] as const)),
);

export function masterSetLogo(seriesId: string, set: MasterSetDefinition) {
  return set.logo ?? assetLogo("pt", seriesId, set.id);
}
