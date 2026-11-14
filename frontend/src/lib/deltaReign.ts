import catalog from "../data/delta-reign-catalog.json" with { type: "json" };
import type { PokemonCard } from "../types/pokemon-card";
import { deltaReignPromos } from "./deltaReignPromos.ts";
import { stampedPromos } from "./stampedPromos.ts";

export const deltaReignCards = catalog.cards as PokemonCard[];

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function searchDeltaReign(search: string): PokemonCard[] {
  const term = normalize(search.trim());
  if (!term) return [];
  const promoNumber = term.match(/^mep[\s-]*(\d+)$/);
  const numbered = term.match(/^(?:(.*?)\s+)?\(?(\d+)(?:\/(\d+|∞))?\)?$/);
  return [...deltaReignCards, ...deltaReignPromos, ...stampedPromos].filter(card => {
    if (card.id === term) return true;
    const searchableText = normalize(`${card.name} ${card.set.name}${card.set.id === "me06" || card.set.id === "mep" ? " Delta Reign" : ""}`);
    if (searchableText.includes(term)) return true;
    if (promoNumber) return card.set.id === "mep" && Number(card.number) === Number(promoNumber[1]);
    if (numbered) {
      return Number(card.number) === Number(numbered[2])
        && (!numbered[3] || numbered[3] === card.set.printedTotalLabel || Number(numbered[3]) === card.set.printedTotal)
        && (!numbered[1] || normalize(card.name).includes(numbered[1]));
    }
    return false;
  });
}
