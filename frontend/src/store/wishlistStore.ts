import { create } from "zustand";
import { WishlistCard } from "@/types/wishlist-card";

const STORAGE_KEY = "carddex_wishlist";

interface WishlistStore {
  items: WishlistCard[];
  addItem: (item: WishlistCard) => void;
  removeItem: (id: string) => void;
}

export const useWishlistStore = create<WishlistStore>((set) => ({
  items: typeof window !== "undefined" ? JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") : [],
  
  addItem: (item) => {
    set((state) => {
      // Evita adicionar a mesma carta duas vezes na wishlist
      if (state.items.some(i => i.pokemonCardId === item.pokemonCardId)) return state;
      
      const newItems = [...state.items, item];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      return { items: newItems };
    });
  },

  removeItem: (id) => {
    set((state) => {
      const newItems = state.items.filter(i => i.id !== id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      return { items: newItems };
    });
  }
}));