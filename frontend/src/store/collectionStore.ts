import { create } from "zustand";
import { CollectionCard } from "@/types/collection-card";
import {
    getCards,
    fetchCardsFromSupabase,
    saveCardToSupabase,
    deleteCardFromSupabase,
    updateCardInSupabase,
} from "@/services/collectionService";

interface CollectionStore {
    cards: CollectionCard[];
    fetchCards: () => Promise<void>;
    addCard: (card: CollectionCard) => Promise<void>;
    removeCard: (id: string) => Promise<void>;
    updateCard: (card: CollectionCard) => Promise<void>;
    getCardsByPokemonId: (pokemonCardId: string) => CollectionCard[];
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
    cards: getCards(),

    fetchCards: async () => {
        const remoteCards = await fetchCardsFromSupabase();
        if (remoteCards.length > 0) {
            set({ cards: remoteCards });
        }
    },

    addCard: async (card) => {
        await saveCardToSupabase(card);
        set((state) => ({
            cards: [...state.cards, card],
        }));
    },

    removeCard: async (id) => {
        await deleteCardFromSupabase(id);
        set((state) => ({
            cards: state.cards.filter((card) => card.id !== id),
        }));
    },

    updateCard: async (updatedCard) => {
        await updateCardInSupabase(updatedCard);
        set((state) => ({
            cards: state.cards.map((card) =>
                card.id === updatedCard.id ? updatedCard : card
            ),
        }));
    },

    getCardsByPokemonId: (pokemonCardId) =>
        get().cards.filter((card) => card.pokemonCardId === pokemonCardId),
}));