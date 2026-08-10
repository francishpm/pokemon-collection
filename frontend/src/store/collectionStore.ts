import { create } from "zustand";
import { CollectionCard } from "@/types/collection-card";
import {
  fetchCardsFromSupabase,
  saveCardToSupabase,
  deleteCardFromSupabase,
  updateCardInSupabase,
  savePokemonSnapshotToSupabase,
} from "@/services/collectionService";
import {
  fetchPokedexRepresentatives,
  savePokedexRepresentative,
} from "@/services/pokedexService";

let repairingPokedexNumbers = false;

function isPokemonWithoutPokedexNumber(card: CollectionCard) {
  const pokemon = card.pokemonData;
  if (!pokemon || pokemon.nationalPokedexNumbers?.length) return false;
  return pokemon.supertype.trim().toLowerCase() !== "trainer";
}

async function repairMissingPokedexNumbers(cards: CollectionCard[]) {
  if (repairingPokedexNumbers) return;

  const missingCards = cards.filter(isPokemonWithoutPokedexNumber);
  if (missingCards.length === 0) return;
  repairingPokedexNumbers = true;

  try {
    const repairedEntries = (await Promise.all(missingCards.map(async (card) => {
      try {
        const response = await fetch(`/api/pokemon/species-number?name=${encodeURIComponent(card.pokemonData!.name)}`);
        if (!response.ok) return null;

        const data = await response.json() as { number?: number | null };
        if (!data.number) return null;

        const pokemonData = {
          ...card.pokemonData!,
          nationalPokedexNumbers: [data.number],
        };
        await savePokemonSnapshotToSupabase(card.id, pokemonData);
        return { id: card.id, pokemonData };
      } catch {
        return null;
      }
    }))).filter((entry) => entry !== null);

    if (repairedEntries.length > 0) {
      const repairedById = new Map(repairedEntries.map((entry) => [entry.id, entry.pokemonData]));
      useCollectionStore.setState((state) => ({
        cards: state.cards.map((card) => {
          const pokemonData = repairedById.get(card.id);
          return pokemonData ? { ...card, pokemonData } : card;
        }),
      }));
    }
  } finally {
    repairingPokedexNumbers = false;
  }
}

interface CollectionStore {
  cards: CollectionCard[];
  pokedexRepresentatives: Record<number, string>;
  isLoading: boolean;
  error: string | null;
  fetchCards: () => Promise<void>;
  addCard: (card: CollectionCard) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  updateCard: (card: CollectionCard) => Promise<void>;
  setPokedexRepresentative: (pokedexNumber: number, collectionCardId: string) => Promise<void>;
  getCardsByPokemonId: (pokemonCardId: string) => CollectionCard[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  cards: [],
  pokedexRepresentatives: {},
  isLoading: false,
  error: null,

  fetchCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const cards = await fetchCardsFromSupabase();
      let pokedexRepresentatives: Record<number, string> = {};
      try {
        pokedexRepresentatives = await fetchPokedexRepresentatives();
      } catch (error) {
        // A coleção principal não pode ficar indisponível quando a migration
        // opcional da Pokédex ainda não foi aplicada ou estiver temporariamente indisponível.
        console.warn("Não foi possível carregar as cartas representantes da Pokédex:", error);
      }
      // A collection can legitimately be empty, and must clear stale UI data.
      set({ cards, pokedexRepresentatives });
      // Repair incomplete legacy snapshots after the initial render so normal
      // navigation stays fast. New cards use the same species resolver.
      void repairMissingPokedexNumbers(cards);
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

  setPokedexRepresentative: async (pokedexNumber, collectionCardId) => {
    set({ error: null });
    try {
      await savePokedexRepresentative(pokedexNumber, collectionCardId);
      set((state) => ({
        pokedexRepresentatives: {
          ...state.pokedexRepresentatives,
          [pokedexNumber]: collectionCardId,
        },
      }));
    } catch (error) {
      set({ error: errorMessage(error, "Não foi possível escolher a carta da Pokédex.") });
      throw error;
    }
  },

  getCardsByPokemonId: (pokemonCardId) =>
    get().cards.filter((card) => card.pokemonCardId === pokemonCardId),
}));
