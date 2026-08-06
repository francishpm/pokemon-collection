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
  created_at: string;
}

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

interface TradesStore {
  trades: TradeItem[];
  tradesView: TradeView[];
  loading: boolean;
  fetchTrades: () => Promise<void>;
  addTrade: (card: PokemonCard, price?: number | null, condition?: string, language?: string) => Promise<void>;
  updatePrice: (tradeId: string, newPrice: number | null) => Promise<void>;
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
      await Promise.all([...new Set(tradesData.map((trade) => trade.card_id))].map(async (cardId) => {
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

  updatePrice: async (tradeId, newPrice) => {
    try {
      const { error } = await supabase.from("trades").update({ price: newPrice }).eq("id", tradeId);
      if (error) throw error;
      set((state) => ({
        trades: state.trades.map((trade) => trade.id === tradeId ? { ...trade, price: newPrice } : trade),
        tradesView: state.tradesView.map((item) => item.trade.id === tradeId
          ? { ...item, trade: { ...item.trade, price: newPrice } }
          : item),
      }));
      toast.success("Preço atualizado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar preço.");
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
