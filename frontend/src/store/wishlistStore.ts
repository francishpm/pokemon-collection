import { create } from "zustand";
import { WishlistCard } from "@/types/wishlist-card";
import {
  deleteWishlistItemFromSupabase,
  fetchWishlistFromSupabase,
  saveWishlistItemToSupabase,
} from "@/services/wishlistService";

interface WishlistStore {
  items: WishlistCard[];
  isLoading: boolean;
  fetchItems: () => Promise<void>;
  addItem: (item: WishlistCard) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistStore>((set) => ({
  items: [],
  isLoading: false,

  fetchItems: async () => {
    set({ isLoading: true });
    try {
      set({ items: await fetchWishlistFromSupabase() });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (item) => {
    if (useWishlistStore.getState().items.some((current) => current.pokemonCardId === item.pokemonCardId)) return;
    const savedItem = await saveWishlistItemToSupabase(item);
    set((state) => ({ items: [...state.items, savedItem] }));
  },

  removeItem: async (id) => {
    await deleteWishlistItemFromSupabase(id);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },
}));
