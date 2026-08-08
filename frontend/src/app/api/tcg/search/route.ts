import { NextResponse } from "next/server";
import { PokemonCard, TcgPlayerPrice } from "@/types/pokemon-card";
import * as cheerio from "cheerio";

const TCG_API_URL = "https://api.pokemontcg.io/v2/cards";
const TCGDEX_API_URL = "https://api.tcgdex.net/v2/en/cards";
const REQUEST_TIMEOUT_MS = 10_000;

export const dynamic = "force-dynamic";

function parseCardNumber(term: string) {
  const match = term.match(/^([a-z]*\d+[a-z]*)(?:\/([a-z]*)(\d+))?$/i);
  if (!match) return null;
  return { number: match[1], printedTotal: match[3] };
}

function parseNameAndNumber(term: string) {
  const match = term.trim().match(/^(.+?)\s+\(?([a-z]*\d+[a-z]*)(?:\/([a-z]*)(\d+))?\)?$/i);
  if (!match) return null;
  return {
    name: match[1].trim(),
    cardNumber: { number: match[2], printedTotal: match[4] },
  };
}

function buildQuery(term: string) {
  const namedCard = parseNameAndNumber(term);
  const cardNumber = parseCardNumber(term) ?? namedCard?.cardNumber;
  if (cardNumber) {
    const hasLetterPrefix = /[a-z]/i.test(cardNumber.number);
    const numberQuery = cardNumber.printedTotal && !hasLetterPrefix
      ? `number:${cardNumber.number} set.printedTotal:${Number(cardNumber.printedTotal)}`
      : `number:${cardNumber.number}`;
    if (namedCard) {
      return `name:"${namedCard.name.replace(/["\\]/g, " ")}*" ${numberQuery}`;
    }
    return numberQuery;
  }
  return `name:"${term.replace(/["\\]/g, " ").trim()}*"`;
}

interface TcgDexCard {
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
  pricing?: {
    tcgplayer?: Record<string, { lowPrice?: number; midPrice?: number; marketPrice?: number }>;
  };
}

function mapTcgDexCard(card: TcgDexCard): PokemonCard | null {
  if (!card.image || !card.set) return null;

  const prices = Object.fromEntries(
    Object.entries(card.pricing?.tcgplayer ?? {}).map(([variant, price]) => [
      variant,
      { low: price.lowPrice, mid: price.midPrice, market: price.marketPrice } satisfies TcgPlayerPrice,
    ])
  );

  return {
    id: card.id,
    name: card.name,
    number: card.localId,
    images: { small: `${card.image}/low.webp`, large: `${card.image}/high.webp` },
    nationalPokedexNumbers: card.dexId,
    rarity: card.rarity,
    supertype: card.category === "Pokemon" ? "Pokémon" : (card.category ?? "Pokémon"),
    subtypes: [card.stage, card.suffix].filter((value): value is string => Boolean(value)),
    set: {
      id: card.set.id,
      name: card.set.name,
      series: card.set.name,
      printedTotal: card.set.cardCount.official,
    },
    tcgplayer: Object.keys(prices).length ? { prices } : undefined,
  };
}

async function searchTcgDex(term: string): Promise<PokemonCard[]> {
  const namedCard = parseNameAndNumber(term);
  const cardNumber = parseCardNumber(term) ?? namedCard?.cardNumber;
  const params = new URLSearchParams(
    namedCard
      ? { name: namedCard.name, localId: cardNumber!.number }
      : cardNumber ? { localId: cardNumber.number } : { name: term }
  );
  const response = await fetch(`${TCGDEX_API_URL}?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) throw new Error("TCGdex indisponível");

  const summaries = (await response.json()) as TcgDexCard[];
  const matchingSummaries = cardNumber
    ? summaries.filter((card) => card.localId.toLowerCase() === cardNumber.number.toLowerCase())
    : summaries;
  const namedSummaries = namedCard
    ? matchingSummaries.filter((card) => normalizeIdentityPart(card.name) === normalizeIdentityPart(namedCard.name))
    : matchingSummaries;
  const details = await Promise.all(
    namedSummaries.slice(0, 100).map(async (summary) => {
      try {
        const detailResponse = await fetch(`${TCGDEX_API_URL}/${encodeURIComponent(summary.id)}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(6_000),
        });
        return detailResponse.ok ? ((await detailResponse.json()) as TcgDexCard) : summary;
      } catch {
        return summary;
      }
    })
  );

  return details
    .filter((card) => !cardNumber?.printedTotal || card.set?.cardCount.official === Number(cardNumber.printedTotal))
    .map(mapTcgDexCard)
    .filter((card): card is PokemonCard => card !== null);
}

async function searchLiga(term: string): Promise<PokemonCard[]> {
  const namedCard = parseNameAndNumber(term);
  const cardNumber = parseCardNumber(term) ?? namedCard?.cardNumber;
  const ligaTerm = namedCard?.name ?? term;

  const params = new URLSearchParams({ view: "cards/search", card: ligaTerm });
  const baseUrl = `https://www.ligapokemon.com.br/?${params}`;
  const urls = cardNumber?.printedTotal ? [baseUrl] : [baseUrl, `${baseUrl}&page=2`];
  const responseResults = await Promise.allSettled(
    urls.map((url) => fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 CardDex/1.0" },
    }))
  );
  const responses = responseResults
    .filter((result): result is PromiseFulfilledResult<Response> => result.status === "fulfilled")
    .map((result) => result.value);
  if (responses.every((response) => !response.ok)) throw new Error("Liga Pokémon indisponível");

  const pages = await Promise.all(
    responses.filter((response) => response.ok).map((response) => response.text())
  );
  const $ = cheerio.load(pages.join("\n"));
  const cards: PokemonCard[] = [];

  $("a.main-link-card").each((_, element) => {
    const href = $(element).attr("href");
    const imagePath = $(element).find("img").attr("data-src") ?? $(element).find("img").attr("src");
    if (!href || !imagePath) return;

    const url = new URL(href, "https://www.ligapokemon.com.br");
    const cardLabel = url.searchParams.get("card") ?? "";
    const edition = url.searchParams.get("ed") ?? "JP";
    const match = cardLabel.match(/^(.*?)\s*\(([^/]+)\/([^)]+)\)$/);
    if (!match) return;
    if (namedCard && normalizeIdentityPart(match[1]) !== normalizeIdentityPart(namedCard.name)) return;
    if (cardNumber && normalizeIdentityPart(match[2]) !== normalizeIdentityPart(cardNumber.number)) return;
    const totalLabel = match[3].trim();
    if (cardNumber?.printedTotal && Number(totalLabel) !== Number(cardNumber.printedTotal)) return;

    const image = imagePath.startsWith("//") ? `https:${imagePath}` : imagePath;
    const japaneseEdition = /^(?:S\d|SV\d|SM\d|XY\d|BW\d|DP\d|PCG|PMCG|NEO|E\d|M\d)/i.test(edition);
    cards.push({
      id: `liga-${edition}-${match[2]}`,
      language: japaneseEdition ? "JP" : "PT",
      name: match[1].trim(),
      number: match[2],
      images: { small: image, large: image },
      supertype: "Pokémon",
      subtypes: [],
      set: {
        id: edition,
        name: japaneseEdition ? `Edição japonesa ${edition}` : `Edição ${edition}`,
        series: japaneseEdition ? "Japão" : "Liga Pokémon",
        printedTotal: /^\d+$/.test(totalLabel) ? Number(totalLabel) : 0,
        printedTotalLabel: totalLabel,
        ligaEdition: edition,
      },
    });
  });

  // Quando há um único resultado, a Liga abre a página da carta diretamente
  // em vez de renderizar a lista usada acima.
  if (cards.length === 0) {
    const featuredImage = $("#featuredImage").attr("src");
    const pageTitle = $("meta[property='og:title']").attr("content") ?? "";
    const directMatch = pageTitle.match(/^(.*?)\s*\(([^/]+)\/([^)]+)\)/);
    const edition = $("a[href*='cards/search&card=ed=']").first().text().trim() || "JP";

    if (featuredImage && directMatch) {
      const totalLabel = directMatch[3].trim();
      const totalMatches = !cardNumber?.printedTotal || Number(totalLabel) === Number(cardNumber.printedTotal);
      if (totalMatches) {
        const image = featuredImage.startsWith("//") ? `https:${featuredImage}` : featuredImage;
        const japaneseEdition = /^(?:S\d|SV\d|SM\d|XY\d|BW\d|DP\d|PCG|PMCG|NEO|E\d|M\d)/i.test(edition);
        cards.push({
          id: `liga-${edition}-${directMatch[2]}`,
          language: japaneseEdition ? "JP" : "PT",
          name: directMatch[1].trim(),
          number: directMatch[2],
          images: { small: image, large: image },
          supertype: "Pokémon",
          subtypes: [],
          set: {
            id: edition,
            name: japaneseEdition ? `Edição japonesa ${edition}` : `Edição ${edition}`,
            series: japaneseEdition ? "Japão" : "Liga Pokémon",
            printedTotal: /^\d+$/.test(totalLabel) ? Number(totalLabel) : 0,
            printedTotalLabel: totalLabel,
            ligaEdition: edition,
          },
        });
      }
    }
  }

  return cards;
}

async function searchJapaneseLigaCode(term: string): Promise<PokemonCard[]> {
  const cardNumber = parseCardNumber(term);
  if (!cardNumber?.printedTotal || !/JP$/i.test(cardNumber.number)) return [];

  const localId = cardNumber.number.replace(/JP$/i, "");
  const summariesResponse = await fetch(`${TCGDEX_API_URL.replace("/en/", "/ja/")}?localId=${encodeURIComponent(localId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  if (!summariesResponse.ok) return [];

  const summaries = (await summariesResponse.json()) as TcgDexCard[];
  const details = await Promise.all(
    summaries
      .filter((card) => card.localId === localId)
      .slice(0, 30)
      .map(async (card) => {
        try {
          const response = await fetch(`${TCGDEX_API_URL.replace("/en/", "/ja/")}/${encodeURIComponent(card.id)}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(6_000),
          });
          return response.ok ? ((await response.json()) as TcgDexCard) : null;
        } catch {
          return null;
        }
      })
  );

  const pokemonCandidates = details.filter(
    (card): card is TcgDexCard => Boolean(card?.dexId?.[0] && card.category === "Pokemon")
  );
  const namedCandidates = await Promise.all(
    pokemonCandidates.map(async (card) => {
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${card.dexId![0]}`, {
          cache: "force-cache",
          signal: AbortSignal.timeout(6_000),
        });
        if (!response.ok) return null;
        const species = (await response.json()) as { name: string };
        return { card, name: species.name };
      } catch {
        return null;
      }
    })
  );

  const ligaResults: Array<PokemonCard | null> = await Promise.all(
    namedCandidates.filter((candidate) => candidate !== null).map(async (candidate) => {
      const displayName = candidate.name.replace(/(^|-)(\w)/g, (_, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`);
      const total = cardNumber.printedTotal!.padStart(localId.length, "0");
      const params = new URLSearchParams({
        view: "cards/card",
        card: `${displayName} (${cardNumber.number}/${total})`,
        num: cardNumber.number,
      });
      try {
        const response = await fetch(`https://www.ligapokemon.com.br/?${params}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
          headers: { "User-Agent": "Mozilla/5.0 CardDex/1.0" },
        });
        if (!response.ok) return null;
        const $ = cheerio.load(await response.text());
        const imagePath = $("#featuredImage").attr("src");
        const title = $("meta[property='og:title']").attr("content") ?? "";
        if (!imagePath || !title.toLowerCase().startsWith(displayName.toLowerCase())) return null;
        const edition = $("a[href*='cards/search&card=ed=']").first().text().trim() || candidate.card.set?.id || "JP";
        const image = imagePath.startsWith("//") ? `https:${imagePath}` : imagePath;
        return {
          id: `liga-${edition}-${cardNumber.number}`,
          language: "JP" as const,
          name: displayName,
          number: cardNumber.number,
          images: { small: image, large: image },
          nationalPokedexNumbers: candidate.card.dexId,
          supertype: "Pokémon",
          subtypes: [],
          set: {
            id: edition,
            name: `Edição japonesa ${edition}`,
            series: "Japão",
            printedTotal: Number(cardNumber.printedTotal),
            printedTotalLabel: total,
            ligaEdition: edition,
          },
        } satisfies PokemonCard;
      } catch {
        return null;
      }
    })
  );

  return ligaResults.filter((card): card is PokemonCard => card !== null);
}

function normalizeIdentityPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9∞]/g, "");
}

function cardIdentity(card: PokemonCard) {
  const number = card.number.replace(/^([a-z]*?)0+(?=\d)/i, "$1");
  const total = String(card.set.printedTotalLabel ?? card.set.printedTotal).replace(/^0+(?=\d)/, "");
  return [normalizeIdentityPart(card.name), normalizeIdentityPart(number), normalizeIdentityPart(total)].join("|");
}

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!term) return NextResponse.json({ error: "Informe o nome ou número da carta." }, { status: 400 });

  const [tcgDexCards, ligaCards, japaneseCodeCards] = await Promise.all([
    searchTcgDex(term).catch(() => []),
    searchLiga(term).catch(() => []),
    searchJapaneseLigaCode(term).catch(() => []),
  ]);
  const uniqueCards = new Map<string, PokemonCard>();
  for (const card of [...tcgDexCards, ...ligaCards, ...japaneseCodeCards]) {
    const identity = cardIdentity(card);
    if (!uniqueCards.has(identity)) uniqueCards.set(identity, card);
  }
  const combinedCards = [...uniqueCards.values()];
  if (combinedCards.length > 0) {
    return NextResponse.json({ data: combinedCards, source: ligaCards.length ? "tcgdex+liga" : "tcgdex" });
  }

  const apiKey = process.env.POKEMON_TCG_API_KEY ?? process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  const authenticatedHeaders: HeadersInit = apiKey ? { "X-Api-Key": apiKey } : {};

  // IDs do catálogo (por exemplo, sv1-81) continuam tendo uma busca direta e rápida.
  if (/^[a-z0-9]+-[a-z0-9]+$/i.test(term)) {
    try {
      const directResponse = await fetch(`${TCG_API_URL}/${encodeURIComponent(term)}`, {
        headers: authenticatedHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (directResponse.ok) {
        const payload = await directResponse.json();
        if (payload.data) return NextResponse.json({ data: [payload.data] });
      }
    } catch {
      // Se não for um ID válido, a busca textual abaixo ainda será tentada.
    }
  }

  const url = `${TCG_API_URL}?q=${encodeURIComponent(buildQuery(term))}&pageSize=250`;
  let rateLimited = false;
  const attempts: HeadersInit[] = apiKey ? [authenticatedHeaders, {}] : [{}, {}];

  for (const headers of attempts) {
    try {
      const response = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        const payload = await response.json();
        return NextResponse.json({ data: payload.data ?? [] });
      }
      rateLimited = response.status === 429;
      const keyWasRejected = response.status === 401 || response.status === 403;
      if (response.status < 500 && !rateLimited && !keyWasRejected) break;
    } catch {
      // A segunda tentativa também remove uma chave vencida ou sem cota.
    }
  }

  return NextResponse.json(
    { error: "O catálogo de cartas está temporariamente indisponível. Tente novamente." },
    { status: rateLimited ? 429 : 503 }
  );
}
