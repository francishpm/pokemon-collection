import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { WishlistCard } from "@/types/wishlist-card";
import { useWishlistStore } from "@/store/wishlistStore";
import { getPokemonCached } from "@/services/pokemonCache";
import { saveWishlistSnapshotToSupabase } from "@/services/wishlistService";

export interface WishlistView {
  wishlist: WishlistCard;
  pokemon: PokemonCard;
}

export function useWishlist() {
  const { items, isLoading, fetchItems, removeItem, addItem } = useWishlistStore();
  const [wishlistView, setWishlistView] = useState<WishlistView[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    void fetchItems().catch((error) => console.error("Unable to load wishlist:", error));
  }, [fetchItems]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      await Promise.resolve();
      if (!items.length) {
        if (!cancelled) {
          setWishlistView([]);
        }
        return;
      }

      if (!cancelled) setLoadingCards(true);
      try {
        const views = (await Promise.all(items.map(async (wishlist) => {
          const pokemon = wishlist.pokemonData ?? await getPokemonCached(wishlist.pokemonCardId);
          if (pokemon && !wishlist.pokemonData) {
            try {
              await saveWishlistSnapshotToSupabase(wishlist.id, pokemon);
            } catch (error) {
              console.warn("Unable to save wishlist snapshot:", error);
            }
          }
          return pokemon ? { wishlist, pokemon } : null;
        }))).filter((item): item is WishlistView => item !== null);

        if (!cancelled) {
          setWishlistView(views);
        }
      } finally {
        if (!cancelled) setLoadingCards(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [items]);

  return { wishlistView, loading: isLoading || loadingCards, removeItem, addItem };
}
