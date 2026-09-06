import { CardCondition, CardLanguage, CollectionCard } from "@/types/collection-card";
import { PokemonCard } from "@/types/pokemon-card";
import { supabase } from "@/lib/supabase";

export interface LigaPriceRequest {
  id?: string;
  name: string;
  number: string;
  total: string;
  setName?: string;
  edition?: string;
  language: CardLanguage;
  condition: CardCondition;
}

export interface LigaPriceResponse {
  id?: string;
  price?: number;
  checkedAt: string;
  url: string;
  status: NonNullable<CollectionCard["ligaPriceStatus"]>;
  sourceTrust?: CollectionCard["ligaPriceSourceTrust"];
  reason?: string;
}

function getLigaPrintedTotal(pokemon: PokemonCard) {
  const savedTotal = String(pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal);
  // Radiant Collection cards are stored as RC7/RC113 by some catalogues,
  // while Liga indexes them as RC7/113.
  const radiantTotal = savedTotal.match(/^RC(\d+)$/i);
  if (/^RC\d+/i.test(pokemon.number) && radiantTotal) return radiantTotal[1].replace(/^0+(?=\d)/, "");
  if (/^RC\d+/i.test(pokemon.number) && /^\d+$/.test(savedTotal)) return savedTotal.replace(/^0+(?=\d)/, "");
  if (!/^\d+$/.test(savedTotal)) return savedTotal;

  // Gallery subsets repeat their prefix on both sides: GG23/GG70,
  // TG01/TG30 and RC01/RC32. Some catalog APIs omit it from the total.
  const galleryPrefix = pokemon.number.match(/^(GG|TG)(?=\d)/i)?.[1]?.toUpperCase();
  return galleryPrefix ? `${galleryPrefix}${savedTotal}` : savedTotal;
}

export function toLigaPriceRequest(
  pokemon: PokemonCard,
  language: CardLanguage,
  condition: CardCondition,
  id?: string,
): LigaPriceRequest {
  return {
    id,
    name: pokemon.name,
    number: pokemon.number,
    total: getLigaPrintedTotal(pokemon),
    setName: pokemon.set.name,
    edition: pokemon.set.ligaEdition,
    language,
    condition,
  };
}

export async function consultLigaPrices(cards: LigaPriceRequest[]) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sua sessão expirou. Entre novamente para consultar os valores.");

  const response = await fetch("/api/liga/price-reference", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ cards }),
  });
  const payload = await response.json() as { results?: LigaPriceResponse[]; error?: string };
  if (!response.ok || !payload.results) throw new Error(payload.error ?? "Consulta da Liga indisponível.");
  return payload.results;
}
