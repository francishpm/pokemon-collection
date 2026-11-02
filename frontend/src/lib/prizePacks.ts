import catalog from "../data/prize-packs.json" with { type: "json" };
import type { PokemonCard } from "../types/pokemon-card";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const numberKey = (text: string) => text.toLowerCase().replace(/\s/g, "").replace(/(^|\/|[a-z])0+(?=\d)/g, "$1");

export function getPrizePackCard(id: string): PokemonCard | null {
  const entry = catalog.cards.find((card) => card.id === id);
  if (!entry) return null;
  const series = entry.series.length ? ` · Série ${entry.series.join(", ")}` : "";
  const variant = entry.variant ? ` · ${entry.variant}` : "";
  const energy = /energy/i.test(entry.type) || (!entry.type && /energy/i.test(entry.name));
  const trainer = /trainer|supporter|item|stadium|tool/i.test(entry.type);
  return {
    id: entry.id, name: entry.name, number: entry.number, language: "EN",
    images: { small: entry.image, large: entry.image },
    rarity: entry.rarity, supertype: energy ? "Energy" : trainer ? "Trainer" : "Pokémon",
    subtypes: [entry.stage].filter(Boolean),
    prizePack: { series: entry.series, variant: entry.variant, originalSet: entry.originalSet, source: entry.source, imageUnavailable: entry.imageKind === "unavailable" },
    set: {
      id: "prize-packs", name: `Prize Pack${series}${variant}${entry.originalSet ? ` · ${entry.originalSet}` : ""}`,
      series: "Play! Pokémon", printedTotal: /^\d+$/.test(entry.total) ? Number(entry.total) : 0, printedTotalLabel: entry.total,
    },
  };
}

export function isPrizePackSearch(term: string) {
  return /\bprizes?\b|\bplay\s*!?\s*pok[eé]mon\b/i.test(term);
}

export function searchPrizePacks(query: string): PokemonCard[] {
  const series = query.match(/(?:s[eé]rie|series)\s*(\d+)/i)?.[1];
  const term = query.replace(/(?:s[eé]rie|series)\s*\d+/gi, "").replace(/\bprizes?(?:\s*packs?)?\b|\bplay\s*!?\s*pok[eé]mon\b/gi, "").trim();
  const number = term.match(/(?:^|\s|\()([a-z]*\d+[a-z]*)(?:\/([a-z]*\d+|∞))?\)?$/i);
  const name = number ? term.slice(0, number.index).trim() : term;
  return catalog.cards.filter((entry) => {
    if (series && !entry.series.includes(Number(series))) return false;
    if (entry.id === query) return true;
    if (number && (numberKey(entry.number) !== numberKey(number[1]) || (number[2] && numberKey(entry.total) !== numberKey(number[2])))) return false;
    const haystack = normalize(`${entry.name} ${entry.variant} ${entry.originalSet}`);
    return normalize(name) === "" || haystack.includes(normalize(name));
  }).map((entry) => getPrizePackCard(entry.id)!);
}
