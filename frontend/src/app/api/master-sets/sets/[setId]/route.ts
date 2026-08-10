import { NextResponse } from "next/server";
import { MasterSetCatalog, MasterSetSlot, MasterSetVariant } from "@/types/master-set";

const TCGDEX = "https://api.tcgdex.net/v2/pt";
const ALLOWED_SETS = new Set(["me01", "me02", "me02.5", "me03", "me04", "me05"]);

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
  if (!ALLOWED_SETS.has(setId)) return NextResponse.json({ error: "Coleção inválida." }, { status: 404 });

  try {
    const set = await fetchJson<SetDetail>(`${TCGDEX}/sets/${encodeURIComponent(setId)}`);
    const details: CardDetail[] = new Array(set.cards.length);
    let cursor = 0;
    const workers = Array.from({ length: 20 }, async () => {
      while (cursor < set.cards.length) {
        const index = cursor++;
        const brief = set.cards[index];
        try {
          details[index] = await fetchJson<CardDetail>(`${TCGDEX}/cards/${encodeURIComponent(brief.id)}`);
        } catch {
          details[index] = brief;
        }
      }
    });
    await Promise.all(workers);

    const slots: MasterSetSlot[] = details.flatMap((card) => variantsForCard(card, setId).map((variant) => ({
      id: `${card.id}:${variant}`,
      cardId: card.id,
      number: card.localId,
      name: card.name,
      image: card.image ? `${card.image}/low.webp` : "",
      rarity: card.rarity,
      variant,
    })));

    const catalog: MasterSetCatalog = {
      id: set.id,
      name: set.name,
      logo: set.logo ? `${set.logo}.${setId === "me05" ? "png" : "webp"}` : undefined,
      totalCards: set.cardCount.total,
      slots,
    };
    return NextResponse.json(catalog);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Catálogo indisponível." }, { status: 502 });
  }
}
