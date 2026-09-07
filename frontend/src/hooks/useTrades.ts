import { supabase } from "@/lib/supabase";
import { PokemonCard } from "@/types/pokemon-card";
import { getPokemonCached } from "@/services/pokemonCache";
import { toast } from "sonner";
import { create } from "zustand";

export interface TradeItem {
  id: string;
  user_id: string;
  card_id: string;
  price: number | null;
  condition?: string;
  language?: string;
  card_name?: string | null;
  card_image_url?: string | null;
  card_set_name?: string | null;
  card_number?: string | null;
  card_set_printed_total?: number | null;
  status?: TradeStatus;
  created_at: string;
}

export type TradeStatus = "available" | "reserved" | "completed";

export interface TradeView {
  trade: TradeItem;
  pokemon: PokemonCard;
}

function createCardSnapshot(card: PokemonCard) {
  return {
    card_name: card.name,
    card_image_url: card.images.small,
    card_set_name: card.set.name,
    card_number: card.number,
    card_set_printed_total: card.set.printedTotal,
  };
}

function inferPromoEdition(trade: TradeItem): string | undefined {
  if ((trade.card_set_printed_total ?? 0) !== 0) return undefined;

  const editionInName = trade.card_set_name?.match(/edi(?:ç|Ã§)[aã]o\s+([a-z0-9.-]+)/i)?.[1];
  if (editionInName) return editionInName.toUpperCase();

  const setId = trade.card_id.match(/^(.+)-[^-]+$/)?.[1];
  return setId?.toUpperCase();
}

function pokemonFromSnapshot(trade: TradeItem): PokemonCard | null {
  if (!trade.card_name || !trade.card_image_url) return null;
  const promoEdition = inferPromoEdition(trade);

  return {
    id: trade.card_id,
    name: trade.card_name,
    number: trade.card_number ?? "",
    images: { small: trade.card_image_url, large: trade.card_image_url },
    supertype: "Pokémon",
    subtypes: [],
    set: {
      id: "snapshot",
      name: trade.card_set_name ?? "",
      series: "",
      printedTotal: trade.card_set_printed_total ?? 0,
      printedTotalLabel: promoEdition ? "∞" : undefined,
      ligaEdition: promoEdition,
    },
  };
}

interface TradesStore {
  trades: TradeItem[];
  tradesView: TradeView[];
  loading: boolean;
  fetchTrades: () => Promise<void>;
  addTrade: (card: PokemonCard, price?: number | null, condition?: string, language?: string) => Promise<void>;
  updateTradeDetails: (tradeId: string, newPrice: number | null, status: TradeStatus) => Promise<boolean>;
  removeTrade: (tradeId: string) => Promise<void>;
}

export const useTrades = create<TradesStore>((set) => ({
  trades: [],
  tradesView: [],
  loading: true,

  fetchTrades: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ trades: [], tradesView: [], loading: false });
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const tradesData = (data ?? []) as TradeItem[];

      const cardsMap: Record<string, PokemonCard> = {};
      tradesData.forEach((trade) => {
        const pokemon = pokemonFromSnapshot(trade);
        if (pokemon) cardsMap[trade.card_id] = pokemon;
      });

      const legacyCardIds = [...new Set(tradesData
        .filter((trade) => !cardsMap[trade.card_id])
        .map((trade) => trade.card_id))];

      await Promise.all(legacyCardIds.map(async (cardId) => {
        const pokemon = await getPokemonCached(cardId);
        if (pokemon) cardsMap[cardId] = pokemon;
      }));

      const combined = tradesData.flatMap((trade) => {
        const pokemon = cardsMap[trade.card_id];
        return pokemon ? [{ trade, pokemon }] : [];
      });

      // Existing records created before snapshots are filled automatically when their
      // owner opens this page. Future public links no longer need the external API.
      const legacyCards = combined.filter(({ trade }) => !trade.card_name || !trade.card_image_url);
      if (legacyCards.length) {
        const updates = await Promise.all(legacyCards.map(async ({ trade, pokemon }) => {
          const { error } = await supabase
            .from("trades")
            .update(createCardSnapshot(pokemon))
            .eq("id", trade.id)
            .eq("user_id", user.id);
          return { trade, pokemon, error };
        }));

        updates.forEach(({ trade, pokemon, error }) => {
          if (error) {
            console.warn("Não foi possível salvar os dados da carta de troca:", error);
            return;
          }
          Object.assign(trade, createCardSnapshot(pokemon));
        });
      }

      set({ trades: tradesData, tradesView: combined, loading: false });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar itens de troca.");
      set({ loading: false });
    }
  },

  addTrade: async (card, price = null, condition = "NM", language = "PT") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const snapshot = createCardSnapshot(card);
      const { data, error } = await supabase
        .from("trades")
        .insert({ user_id: user.id, card_id: card.id, price, condition, language, ...snapshot })
        .select()
        .single();

      if (error) throw error;
      const newTrade = data as TradeItem;
      set((state) => ({
        trades: [newTrade, ...state.trades],
        tradesView: [{ trade: newTrade, pokemon: card }, ...state.tradesView],
      }));
      toast.success("Carta adicionada para trocas!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar carta.");
    }
  },

  updateTradeDetails: async (tradeId, newPrice, status) => {
    try {
      const { error } = await supabase.from("trades").update({ price: newPrice, status }).eq("id", tradeId);
      if (error) throw error;
      set((state) => ({
        trades: state.trades.map((trade) => trade.id === tradeId ? { ...trade, price: newPrice, status } : trade),
        tradesView: state.tradesView.map((item) => item.trade.id === tradeId
          ? { ...item, trade: { ...item.trade, price: newPrice, status } }
          : item),
      }));
      toast.success(status === "completed" ? "Negociação concluída!" : "Carta atualizada!");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar a carta.");
      return false;
    }
  },

  removeTrade: async (tradeId) => {
    try {
      const { error } = await supabase.from("trades").delete().eq("id", tradeId);
      if (error) throw error;
      set((state) => ({
        trades: state.trades.filter((trade) => trade.id !== tradeId),
        tradesView: state.tradesView.filter((item) => item.trade.id !== tradeId),
      }));
      toast.success("Removido das trocas.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover item.");
    }
  },
}));
