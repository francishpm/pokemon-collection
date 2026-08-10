import { NextResponse } from "next/server";
import { PokemonCard } from "@/types/pokemon-card";

const TCGDEX_API = "https://api.tcgdex.net/v2/en/cards";
const SPECIAL_RARITIES = new Set([
  "amazing rare",
  "black white rare",
  "character rare",
  "character super rare",
  "classic collection",
  "full art trainer",
  "hyper rare",
  "illustration rare",
  "mega hyper rare",
  "radiant rare",
  "secret rare",
  "shiny rare",
  "shiny rare v",
  "shiny rare vmax",
  "shiny ultra rare",
  "special illustration rare",
  "ultra rare",
]);

interface TcgDexSummary {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

interface TcgDexCard extends TcgDexSummary {
  category?: string;
  rarity?: string;
  dexId?: number[];
  stage?: string;
  suffix?: string;
  set?: {
    id: string;
    name: string;
    cardCount?: { official?: number };
  };
}

function toPokemonCard(card: TcgDexCard, pokedexNumber: number): PokemonCard | null {
  if (!card.image || !card.set) return null;

  return {
    id: card.id,
    language: "EN",
    name: card.name,
    number: card.localId,
    images: {
      small: `${card.image}/low.webp`,
      large: `${card.image}/high.webp`,
    },
    nationalPokedexNumbers: card.dexId?.length ? card.dexId : [pokedexNumber],
    rarity: card.rarity,
    supertype: "Pokémon",
    subtypes: [card.stage, card.suffix].filter((value): value is string => Boolean(value)),
    set: {
      id: card.set.id,
      name: card.set.name,
      series: card.set.name,
      printedTotal: card.set.cardCount?.official ?? 0,
    },
  };
}

async function fetchCardDetails(summaries: TcgDexSummary[]) {
  const results: Array<TcgDexCard | null> = new Array(summaries.length).fill(null);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(8, summaries.length) }, async () => {
    while (cursor < summaries.length) {
      const index = cursor++;
      try {
        const response = await fetch(`${TCGDEX_API}/${encodeURIComponent(summaries[index].id)}`, {
          next: { revalidate: 86_400 },
          signal: AbortSignal.timeout(8_000),
        });
        if (response.ok) results[index] = await response.json() as TcgDexCard;
      } catch {
        results[index] = null;
      }
    }
  });

  await Promise.all(workers);
  return results.filter((card): card is TcgDexCard => card !== null);
}

export async function GET(request: Request) {
  const pokedexNumber = Number(new URL(request.url).searchParams.get("number"));
  if (!Number.isInteger(pokedexNumber) || pokedexNumber < 1 || pokedexNumber > 1025) {
    return NextResponse.json({ error: "Número da Pokédex inválido." }, { status: 400 });
  }

  try {
    const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokedexNumber}`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!speciesResponse.ok) throw new Error("Espécie não encontrada");
    const species = await speciesResponse.json() as {
      name: string;
      names?: Array<{ language: { name: string }; name: string }>;
    };
    const speciesName = species.names?.find(({ language }) => language.name === "en")?.name
      ?? species.name.replace(/(^|-)(\w)/g, (_, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`);

    const summariesResponse = await fetch(`${TCGDEX_API}?name=${encodeURIComponent(speciesName)}`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!summariesResponse.ok) throw new Error("Catálogo indisponível");
    const summaries = (await summariesResponse.json() as TcgDexSummary[]).slice(0, 150);
    const details = await fetchCardDetails(summaries);

    const cards = details
      .filter((card) => card.category === "Pokemon")
      .filter((card) => card.dexId?.includes(pokedexNumber))
      .filter((card) => card.rarity && SPECIAL_RARITIES.has(card.rarity.toLocaleLowerCase("en-US")))
      .map((card) => toPokemonCard(card, pokedexNumber))
      .filter((card): card is PokemonCard => card !== null)
      .sort((a, b) => (a.rarity ?? "").localeCompare(b.rarity ?? "") || a.set.name.localeCompare(b.set.name));

    return NextResponse.json({ speciesName, cards });
  } catch (error) {
    console.error("Erro ao buscar artes especiais:", error);
    return NextResponse.json({ error: "Não foi possível buscar as artes especiais agora." }, { status: 502 });
  }
}
