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
  const [totalEstimado, setTotalEstimado] = useState(0);
  const [loadingValues, setLoadingValues] = useState(false);

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
          setTotalEstimado(0);
        }
        return;
      }

      if (!cancelled) setLoadingValues(true);
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

        let dollarRate = 5;
        try {
          const response = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
          if (response.ok) {
            const data = await response.json();
            dollarRate = Number.parseFloat(data.USDBRL.ask) || dollarRate;
          }
        } catch {
          // Keep the fallback rate when the quotation service is unavailable.
        }

        const total = views.reduce((sum, { pokemon }) => {
          const prices = pokemon.tcgplayer?.prices;
          if (!prices) return sum;
          for (const price of Object.values(prices)) {
            if (price.market) return sum + price.market * dollarRate;
            if (price.mid) return sum + price.mid * dollarRate;
          }
          return sum;
        }, 0);

        if (!cancelled) {
          setWishlistView(views);
          setTotalEstimado(total);
        }
      } finally {
        if (!cancelled) setLoadingValues(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [items]);

  return { wishlistView, totalEstimado, loading: isLoading || loadingValues, removeItem, addItem };
}
