import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PriceKind = "Market" | "Mid" | "Low";

interface PriceResult {
  value: number;
  kind: PriceKind;
}

interface PokemonTcgCardPrice {
  market?: number;
  mid?: number;
  low?: number;
}

interface PokemonTcgCard {
  tcgplayer?: { prices?: Record<string, PokemonTcgCardPrice> };
}

interface TcgDexCard {
  pricing?: { tcgplayer?: Record<string, unknown> };
}

function extractPokemonTcgPrice(card: PokemonTcgCard): PriceResult | null {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;

  let fallback: PriceResult | null = null;
  for (const price of Object.values(prices)) {
    if (price.market) return { value: price.market, kind: "Market" };
    if (!fallback && price.mid) fallback = { value: price.mid, kind: "Mid" };
    if (!fallback && price.low) fallback = { value: price.low, kind: "Low" };
  }
  return fallback;
}

function extractTcgDexPrice(card: TcgDexCard): PriceResult | null {
  const prices = card.pricing?.tcgplayer;
  if (!prices) return null;

  let fallback: PriceResult | null = null;
  for (const price of Object.values(prices)) {
    if (!price || typeof price !== "object") continue;
    const values = price as Record<string, number | undefined>;
    if (values.marketPrice) return { value: values.marketPrice, kind: "Market" };
    if (!fallback && values.midPrice) fallback = { value: values.midPrice, kind: "Mid" };
    if (!fallback && values.lowPrice) fallback = { value: values.lowPrice, kind: "Low" };
  }
  return fallback;
}

async function getCardPrice(cardId: string) {
  // IDs criados a partir da Liga não existem nos catálogos globais por ID.
  // A busca por nome e número feita depois é a estratégia correta para eles.
  if (cardId.startsWith("liga-")) return null;

  const apiKey = process.env.POKEMON_TCG_API_KEY ?? process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  try {
    const response = await fetch(`https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardId)}`, {
      headers: apiKey ? { "X-Api-Key": apiKey } : {},
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const payload = await response.json();
      const price = extractPokemonTcgPrice((payload.data ?? {}) as PokemonTcgCard);
      if (price) return { ...price, source: "pokemontcg" };
    }
  } catch {
    // IDs do TCGdex e falhas temporárias seguem para o catálogo alternativo.
  }

  try {
    const response = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`, {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const card = await response.json();
      const price = extractTcgDexPrice(card as TcgDexCard);
      if (price) return { ...price, source: "tcgdex" };
    }
  } catch {
    // A ausência nas duas fontes é retornada de forma controlada abaixo.
  }

  return null;
}

function normalizeCardText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function getCardPriceByDetails(name: string, number: string, printedTotal?: string) {
  const localId = number.replace(/JP$/i, "");
  try {
    const response = await fetch(`https://api.tcgdex.net/v2/en/cards?localId=${encodeURIComponent(localId)}`, {
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const summaries = (await response.json()) as Array<{ id: string; localId: string; name: string }>;
    const matchingSummaries = summaries
      .filter((card) => card.localId.toLowerCase() === localId.toLowerCase())
      .filter((card) => normalizeCardText(card.name) === normalizeCardText(name))
      .slice(0, 20);

    const details = await Promise.all(
      matchingSummaries.map(async (card) => {
        try {
          const detailResponse = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(card.id)}`, {
            signal: AbortSignal.timeout(4_000),
            next: { revalidate: 3600 },
          });
          return detailResponse.ok ? ((await detailResponse.json()) as TcgDexCard & { set?: { cardCount?: { official?: number } } }) : null;
        } catch {
          return null;
        }
      })
    );

    const requestedTotal = printedTotal && /^\d+$/.test(printedTotal) ? Number(printedTotal) : null;
    const orderedDetails = requestedTotal
      ? [...details].sort((a, b) => {
          const aMatches = a?.set?.cardCount?.official === requestedTotal ? 1 : 0;
          const bMatches = b?.set?.cardCount?.official === requestedTotal ? 1 : 0;
          return bMatches - aMatches;
        })
      : details;

    for (const card of orderedDetails) {
      if (!card) continue;
      const price = extractTcgDexPrice(card);
      if (price) return { ...price, source: "tcgdex-search" };
    }
  } catch {
    // A ausência por metadados é tratada como carta sem cotação.
  }
  return null;
}

async function getDollarRate() {
  try {
    const response = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL", {
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const data = await response.json();
      const rate = Number.parseFloat(data.USDBRL?.ask);
      if (Number.isFinite(rate) && rate > 0) return { rate, fallback: false };
    }
  } catch {
    // Mantém o preço visível mesmo se o serviço de câmbio estiver indisponível.
  }
  return { rate: 5, fallback: true };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const cardId = searchParams.get("id")?.trim();
  const name = searchParams.get("name")?.trim();
  const number = searchParams.get("number")?.trim();
  const printedTotal = searchParams.get("total")?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "O ID da carta é obrigatório" }, { status: 400 });
  }

  const price = await getCardPrice(cardId)
    ?? (name && number ? await getCardPriceByDetails(name, number, printedTotal) : null);
  if (!price) {
    return NextResponse.json({
      success: true,
      prices: { usd: 0, brl: 0, usdText: "", brlText: "" },
    });
  }

  const dollar = await getDollarRate();
  const marketPriceBRL = price.value * dollar.rate;

  return NextResponse.json({
    success: true,
    source: price.source,
    cotacaoDolarUsada: dollar.rate,
    cotacaoEstimada: dollar.fallback,
    tipoPrecoUsado: price.kind,
    prices: {
      usd: price.value,
      brl: marketPriceBRL,
      usdText: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price.value),
      brlText: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(marketPriceBRL),
    },
  });
}
