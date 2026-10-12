import test from "node:test";
import assert from "node:assert/strict";
import { filterAndSortTrades } from "../src/lib/tradeFilters.ts";
import type { TradeView } from "../src/hooks/useTrades.ts";

function card(id: string, price: number | null, status = "available"): TradeView {
  return {
    trade: { id, price, status, created_at: "2026-10-12" },
    pokemon: { name: id, number: "1", set: { name: "Coleção", printedTotal: 30 } },
  } as TradeView;
}

const filters = { search: "", sortBy: "price_desc", priceFilter: "all", statusFilter: "active" as const };

test("PDF order puts highest prices first and unpriced cards last", () => {
  const cards = [card("barata", 3), card("troca", null), card("cara", 100), card("concluída", 200, "completed"), card("reservada", 20, "reserved")];
  assert.deepEqual(filterAndSortTrades(cards, filters).map(({ trade }) => trade.id), ["cara", "reservada", "barata", "troca"]);
  assert.equal(cards[0].trade.id, "barata");
  assert.deepEqual(filterAndSortTrades(cards, { ...filters, sortBy: "price_asc" }).map(({ trade }) => trade.id), ["barata", "reservada", "cara", "troca"]);
});

test("PDF selection respects search, price and status filters together", () => {
  const cards = [card("Lugia", 100), card("Lugia reservada", 80, "reserved"), card("Lugia troca", null, "reserved"), card("Charizard", 90, "reserved")];
  assert.deepEqual(filterAndSortTrades(cards, { ...filters, search: "lugia", priceFilter: "priced", statusFilter: "reserved" }).map(({ trade }) => trade.id), ["Lugia reservada"]);
  assert.deepEqual(filterAndSortTrades(cards, { ...filters, priceFilter: "trade_only" }).map(({ trade }) => trade.id), ["Lugia troca"]);
});
