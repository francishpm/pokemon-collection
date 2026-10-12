import type { TradeView, TradeStatus } from "../hooks/useTrades.ts";

export interface TradeFilters {
  search: string;
  sortBy: string;
  priceFilter: string;
  statusFilter: "active" | TradeStatus;
}

export function filterAndSortTrades(tradesView: TradeView[], { search, sortBy, priceFilter, statusFilter }: TradeFilters): TradeView[] {
        const term = search.trim().toLowerCase();

        return tradesView.filter(({ trade, pokemon }) => {
            const status = (trade.status ?? "available");
            if (statusFilter === "active" ? status === "completed" : status !== statusFilter) return false;
            if (priceFilter === "priced" && trade.price == null) return false;
            if (priceFilter === "trade_only" && trade.price != null) return false;

            const fullNumber = `${pokemon.number}/${pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal}`.toLowerCase();
            return !term || (
                pokemon.name.toLowerCase().includes(term) ||
                pokemon.number.toLowerCase().includes(term) ||
                fullNumber.includes(term) ||
                pokemon.set.name.toLowerCase().includes(term)
            );
        }).sort((a, b) => {
            if (sortBy === "name") return a.pokemon.name.localeCompare(b.pokemon.name, "pt-BR");
            if (sortBy === "set") return a.pokemon.set.name.localeCompare(b.pokemon.set.name, "pt-BR") || a.pokemon.name.localeCompare(b.pokemon.name, "pt-BR");
            if (sortBy === "price_asc" || sortBy === "price_desc") {
                if (a.trade.price == null && b.trade.price == null) return 0;
                if (a.trade.price == null) return 1;
                if (b.trade.price == null) return -1;
                return sortBy === "price_asc" ? a.trade.price - b.trade.price : b.trade.price - a.trade.price;
            }
            return new Date(b.trade.created_at).getTime() - new Date(a.trade.created_at).getTime();
        });
}
