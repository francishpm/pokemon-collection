import { NextResponse } from "next/server";
import { MASTER_SET_BY_ID, masterSetLogo } from "@/lib/masterSetConfig";
import { MasterSetCatalog, MasterSetSlot, MasterSetVariant } from "@/types/master-set";

const TCGDEX_ROOT = "https://api.tcgdex.net/v2";

interface CardBrief { id: string; localId: string; name: string; image?: string }
interface SetDetail {
  id: string;
  name: string;
  logo?: string;
  cardCount: { total: number };
  cards: CardBrief[];
}
interface CardDetail extends CardBrief {
  category?: string;
  rarity?: string;
  variants?: { normal?: boolean; reverse?: boolean; holo?: boolean; firstEdition?: boolean };
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function imageUrlForCard(setId: string, seriesId: string, localId: string) {
  if (setId !== "sve") {
    return `https://assets.tcgdex.net/en/${seriesId}/${setId}/${localId.padStart(3, "0")}/low.webp`;
  }

  const number = Number(localId);
  return number <= 16
    ? `https://images.pokemontcg.io/sve/${number}.png`
    : `https://pkmncards.com/wp-content/uploads/sve_en_${localId.padStart(3, "0")}_std.png`;
}

function variantsForCard(card: CardDetail, setId: string): MasterSetVariant[] {
  const variants = card.variants ?? {};
  const category = normalize(card.category ?? "");
  const rarity = normalize(card.rarity ?? "");
  const isBasicAscendedPokemon = setId === "me02.5"
    && category === "pokemon"
    && ["common", "comum", "uncommon", "incomum", "rare", "rara"].includes(rarity);

  if (isBasicAscendedPokemon) return ["normal", "pokeball", "energy"];

  const result: MasterSetVariant[] = [];
  if (variants.normal) result.push("normal");
  if (variants.reverse) result.push("reverse");
  if (variants.holo) result.push("holo");
  if (variants.firstEdition) result.push("first_edition");
  return result.length ? result : ["normal"];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`TCGdex respondeu HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export async function GET(_: Request, context: { params: Promise<{ setId: string }> }) {
  const { setId } = await context.params;
  const configuredSet = MASTER_SET_BY_ID.get(setId);
  if (!configuredSet) return NextResponse.json({ error: "Coleção inválida." }, { status: 404 });

  try {
    const encodedSetId = encodeURIComponent(setId);
    const [set, englishSet] = await Promise.all([
      fetchJson<SetDetail>(`${TCGDEX_ROOT}/pt/sets/${encodedSetId}`),
      fetchJson<SetDetail>(`${TCGDEX_ROOT}/en/sets/${encodedSetId}`),
    ]);
    const localizedIds = new Set(set.cards.map((card) => card.id));
    const cards = [...new Map([...englishSet.cards, ...set.cards].map((card) => [card.id, card])).values()];
    const details: CardDetail[] = new Array(cards.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(20, cards.length) }, async () => {
      while (cursor < cards.length) {
        const index = cursor++;
        const brief = cards[index];
        const preferredLanguage = localizedIds.has(brief.id) ? "pt" : "en";
        try {
          details[index] = await fetchJson<CardDetail>(`${TCGDEX_ROOT}/${preferredLanguage}/cards/${encodeURIComponent(brief.id)}`);
        } catch {
          try {
            details[index] = await fetchJson<CardDetail>(`${TCGDEX_ROOT}/en/cards/${encodeURIComponent(brief.id)}`);
          } catch {
            details[index] = brief;
          }
        }
      }
    });
    await Promise.all(workers);

    const slots: MasterSetSlot[] = details.flatMap((card) => variantsForCard(card, setId).map((variant) => ({
      id: `${card.id}:${variant}`,
      cardId: card.id,
      number: card.localId,
      name: card.name,
      image: imageUrlForCard(setId, configuredSet.seriesId, card.localId),
      rarity: card.rarity,
      variant,
    })));

    const catalog: MasterSetCatalog = {
      id: set.id,
      name: set.name,
      logo: set.logo ? `${set.logo}.webp` : masterSetLogo(configuredSet.seriesId, configuredSet),
      totalCards: Math.max(set.cardCount.total, englishSet.cardCount.total),
      slots,
    };
    return NextResponse.json(catalog);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Catálogo indisponível." }, { status: 502 });
  }
}
