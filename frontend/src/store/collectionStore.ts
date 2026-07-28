import { create } from "zustand";
import { CollectionCard } from "@/types/collection-card";
import {
    getCards,
    saveCard,
    deleteCard,
    updateCard as updateCardStorage,
} from "@/services/collectionService";

interface CollectionStore {
    cards: CollectionCard[];

    addCard: (card: CollectionCard) => void;

    removeCard: (id: string) => void;

    updateCard: (card: CollectionCard) => void;

    getCardsByPokemonId: (pokemonCardId: string) => CollectionCard[];
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
    cards: getCards(),

    addCard: (card) => {
        console.log("ANTES:", get().cards.length);

        saveCard(card);

        set((state) => {
            const updated = [...state.cards, card];

            console.log("DEPOIS:", updated.length);

            return {
                cards: updated,
            };
        });
    },

    removeCard: (id) => {
        deleteCard(id);

        set((state) => ({
            cards: state.cards.filter((card) => card.id !== id),
        }));
    },

    updateCard: (updatedCard) => {
        updateCardStorage(updatedCard);

        set((state) => ({
            cards: state.cards.map((card) =>
                card.id === updatedCard.id ? updatedCard : card
            ),
        }));
    },

    getCardsByPokemonId: (pokemonCardId) =>
        get().cards.filter((card) => card.pokemonCardId === pokemonCardId),
}));