import { NextResponse } from "next/server";
import { collectLigaPrice, LigaPriceQuery } from "@/lib/ligaPriceCollector";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json() as { cards?: LigaPriceQuery[] };
  const cards = body.cards ?? [];
  if (!cards.length || cards.length > 25) {
    return NextResponse.json({ error: "Envie entre 1 e 25 cartas." }, { status: 400 });
  }

  const results = new Array(cards.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < cards.length) {
      const index = nextIndex++;
      results[index] = await collectLigaPrice(cards[index]);
    }
  }
  // Liga throttles bursts aggressively, so batch requests are intentionally
  // processed one card at a time, like the reliable single-card flow.
  await worker();
  return NextResponse.json({ results });
}
