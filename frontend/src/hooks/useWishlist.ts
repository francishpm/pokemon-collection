import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { WishlistCard } from "@/types/wishlist-card";
import { useWishlistStore } from "@/store/wishlistStore";
import { getPokemonCached } from "@/services/pokemonCache";

export interface WishlistView {
  wishlist: WishlistCard;
  pokemon: PokemonCard;
}

export function useWishlist() {
  const { items, removeItem, addItem } = useWishlistStore();
  const [wishlistView, setWishlistView] = useState<WishlistView[]>([]);
  const [totalEstimado, setTotalEstimado] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await Promise.all(
          items.map(async (wishlist) => {
            const pokemon = await getPokemonCached(wishlist.pokemonCardId);
            if (!pokemon) return null;
            return { wishlist, pokemon };
          })
        );

        const validCards = data.filter((item): item is WishlistView => item !== null);
        setWishlistView(validCards);

        // Busca o dólar atual para conversão
        let dolarAtual = 5.00; 
        try {
          const cotacaoRes = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
          const cotacaoData = await cotacaoRes.json();
          dolarAtual = parseFloat(cotacaoData.USDBRL.ask);
        } catch {
          console.error("Falha ao buscar cotação.");
        }

        // Calcula o custo total da Wishlist
        let soma = 0;
        validCards.forEach(({ pokemon }) => {
          let precoGlobalUsd = 0;
          const prices = pokemon.tcgplayer?.prices;
          if (prices) {
            for (const key in prices) {
              if (prices[key]?.market) { precoGlobalUsd = prices[key].market; break; }
              else if (prices[key]?.mid && precoGlobalUsd === 0) { precoGlobalUsd = prices[key].mid; }
            }
          }
          soma += precoGlobalUsd * dolarAtual;
        });

        setTotalEstimado(soma);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [items]);

  return { wishlistView, totalEstimado, loading, removeItem, addItem };
}
