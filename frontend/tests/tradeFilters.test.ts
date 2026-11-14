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

test("completed history ignores review filters and remains separate from active reviews", () => {
  const completed = card("historico", 10, "completed");
  const reviewed = card("historico revisado", 20, "completed");
  reviewed.trade.reviewed = true;
  const active = card("ativa", 30);
  for (const reviewFilter of ["reviewed", "unreviewed"] as const) {
    assert.equal(filterAndSortTrades([completed, reviewed, active], { ...filters, statusFilter: "completed", reviewFilter }).length, 2);
  }
  assert.deepEqual(filterAndSortTrades([completed, reviewed, active], { ...filters, reviewFilter: "unreviewed" }).map(({ trade }) => trade.id), ["ativa"]);
});

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

test("trade search includes optional variant labels without merging separate printings", () => {
  const normal = card("Vaporeon", 4);
  const pokeBall = card("Vaporeon Pokébola", 8);
  pokeBall.pokemon.name = "Vaporeon";
  pokeBall.trade.variant_label = "Pokébola";
  assert.deepEqual(filterAndSortTrades([normal, pokeBall], { ...filters, search: "pokébola" }).map(({ trade }) => trade.id), ["Vaporeon Pokébola"]);
});


test("review filters distinguish existing unreviewed cards and combine with other filters", () => {
  const pending = card("Lugia", 10);
  const reviewed = card("Lugia revisada", 20);
  reviewed.trade.reviewed = true;
  const explicitPending = card("Charizard", 30);
  explicitPending.trade.reviewed = false;
  const cards = [pending, reviewed, explicitPending];
  assert.equal(filterAndSortTrades(cards, filters).length, 3);
  assert.deepEqual(filterAndSortTrades(cards, { ...filters, reviewFilter: "unreviewed" }).map(({ trade }) => trade.id), ["Charizard", "Lugia"]);
  assert.deepEqual(filterAndSortTrades(cards, { ...filters, reviewFilter: "reviewed" }).map(({ trade }) => trade.id), ["Lugia revisada"]);
  assert.deepEqual(filterAndSortTrades(cards, { ...filters, reviewFilter: "unreviewed", search: "lugia" }).map(({ trade }) => trade.id), ["Lugia"]);
});
