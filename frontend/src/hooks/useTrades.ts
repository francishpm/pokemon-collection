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
    condition?: string; // Novo campo
    language?: string;  // Novo campo
    created_at: string;
}

export interface TradeView {
    trade: TradeItem;
    pokemon: PokemonCard;
}

interface TradesStore {
    trades: TradeItem[];
    tradesView: TradeView[];
    loading: boolean;
    fetchTrades: () => Promise<void>;
    
    // 👇 Esta é a linha que precisa mudar 👇
    addTrade: (card: PokemonCard, price?: number | null, condition?: string, language?: string) => Promise<void>;
    
    updatePrice: (tradeId: string, newPrice: number | null) => Promise<void>;
    removeTrade: (tradeId: string) => Promise<void>;
}

export const useTrades = create<TradesStore>((set, get) => ({
    trades: [],
    tradesView: [],
    loading: true,

    fetchTrades: async () => {
        set({ loading: true });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                set({ loading: false });
                return;
            }

            const { data: tradesData, error } = await supabase
                .from("trades")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (tradesData && tradesData.length > 0) {
                const cardIds = tradesData.map((t) => t.card_id);
                const cardsMap: Record<string, PokemonCard> = {};

                await Promise.all(
                    cardIds.map(async (cardId) => {
                        try {
                            const pokemon = await getPokemonCached(cardId);
                            if (pokemon) {
                                cardsMap[cardId] = pokemon;
                            }
                        } catch (e) {
                            console.error(`Erro ao buscar carta ${cardId}`, e);
                        }
                    })
                );

                const combined: TradeView[] = tradesData
                    .map((trade) => ({
                        trade,
                        pokemon: cardsMap[trade.card_id],
                    }))
                    .filter((item) => item.pokemon !== undefined);

                set({ trades: tradesData, tradesView: combined, loading: false });
            } else {
                set({ trades: [], tradesView: [], loading: false });
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao carregar itens de troca.");
            set({ loading: false });
        }
    },

    addTrade: async (card: PokemonCard, price: number | null = null, condition: string = "NM", language: string = "PT") => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const tempId = crypto.randomUUID();
            const newTradeItem: TradeItem = {
                id: tempId,
                user_id: user.id,
                card_id: card.id,
                price,
                condition,
                language,
                created_at: new Date().toISOString(),
            };

            set((state) => ({
                trades: [newTradeItem, ...state.trades],
                tradesView: [{ trade: newTradeItem, pokemon: card }, ...state.tradesView]
            }));

            // Enviando os novos campos para o banco
            const { error } = await supabase.from("trades").insert([
                { user_id: user.id, card_id: card.id, price, condition, language }
            ]);

            if (error) throw error;
            toast.success("Carta adicionada para trocas!");
            get().fetchTrades();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao adicionar carta.");
            get().fetchTrades();
        }
    },

    updatePrice: async (tradeId: string, newPrice: number | null) => {
        try {
            const { error } = await supabase
                .from("trades")
                .update({ price: newPrice })
                .eq("id", tradeId);

            if (error) throw error;
            toast.success("Preço atualizado!");
            get().fetchTrades();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao atualizar preço.");
        }
    },

    removeTrade: async (tradeId: string) => {
        try {
            // Otimismo para remover instantaneamente da tela
            set((state) => ({
                tradesView: state.tradesView.filter(t => t.trade.id !== tradeId)
            }));

            const { error } = await supabase.from("trades").delete().eq("id", tradeId);
            if (error) throw error;

            toast.success("Removido das trocas.");
            get().fetchTrades();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao remover item.");
            get().fetchTrades(); // Reverte em caso de erro
        }
    }
}));