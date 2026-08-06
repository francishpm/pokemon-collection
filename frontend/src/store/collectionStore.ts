import { create } from "zustand";
import { CollectionCard } from "@/types/collection-card";
import {
  fetchCardsFromSupabase,
  saveCardToSupabase,
  deleteCardFromSupabase,
  updateCardInSupabase,
} from "@/services/collectionService";

interface CollectionStore {
  cards: CollectionCard[];
  isLoading: boolean;
  error: string | null;
  fetchCards: () => Promise<void>;
  addCard: (card: CollectionCard) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  updateCard: (card: CollectionCard) => Promise<void>;
  getCardsByPokemonId: (pokemonCardId: string) => CollectionCard[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  cards: [],
  isLoading: false,
  error: null,

  fetchCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const cards = await fetchCardsFromSupabase();
      // A collection can legitimately be empty, and must clear stale UI data.
      set({ cards });
    } catch (error) {
      set({ error: errorMessage(error, "Unable to load the collection.") });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addCard: async (card) => {
    set({ error: null });
    try {
      const savedCard = await saveCardToSupabase(card);
      set((state) => ({ cards: [...state.cards, savedCard] }));
    } catch (error) {
      set({ error: errorMessage(error, "Unable to add the card.") });
      throw error;
    }
  },

  removeCard: async (id) => {
    set({ error: null });
    try {
      await deleteCardFromSupabase(id);
      set((state) => ({ cards: state.cards.filter((card) => card.id !== id) }));
    } catch (error) {
      set({ error: errorMessage(error, "Unable to remove the card.") });
      throw error;
    }
  },

  updateCard: async (card) => {
    set({ error: null });
    try {
      const savedCard = await updateCardInSupabase(card);
      set((state) => ({
        cards: state.cards.map((currentCard) => currentCard.id === savedCard.id ? savedCard : currentCard),
      }));
    } catch (error) {
      set({ error: errorMessage(error, "Unable to update the card.") });
      throw error;
    }
  },

  getCardsByPokemonId: (pokemonCardId) =>
    get().cards.filter((card) => card.pokemonCardId === pokemonCardId),
}));
