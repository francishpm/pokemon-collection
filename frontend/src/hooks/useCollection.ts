import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { CollectionCard } from "@/types/collection-card";
import { useCollectionStore } from "@/store/collectionStore";
import { getPokemonCached } from "@/services/pokemonCache";
import { savePokemonSnapshotToSupabase } from "@/services/collectionService";

export interface CollectionView {
  collection: CollectionCard;
  pokemon: PokemonCard;
}

function getMarketPriceUsd(pokemon: PokemonCard): number {
  const prices = pokemon.tcgplayer?.prices;
  if (!prices) return 0;

  let fallback = 0;
  for (const price of Object.values(prices)) {
    if (!price || typeof price !== "object") continue;
    const value = price as { market?: number; mid?: number; low?: number };
    if (value.market) return value.market;
    fallback ||= value.mid ?? value.low ?? 0;
  }
  return fallback;
}

export function useCollection() {
  const { cards, removeCard } = useCollectionStore();
  const [collectionView, setCollectionView] = useState<CollectionView[]>([]);
  const [totalInvestido, setTotalInvestido] = useState(0);
  const [valorMercado, setValorMercado] = useState(0);
  const [carregandoValores, setCarregandoValores] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Keeps every state transition asynchronous and prevents stale global cache data.
      await Promise.resolve();

      if (cards.length === 0) {
        if (!cancelled) {
          setCollectionView([]);
          setTotalInvestido(0);
          setValorMercado(0);
          setCarregandoValores(false);
        }
        return;
      }

      if (!cancelled) setCarregandoValores(true);

      try {
        let dollarRate = 5;
        try {
          const response = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
          if (response.ok) {
            const data = await response.json();
            dollarRate = Number.parseFloat(data.USDBRL.ask) || dollarRate;
          }
        } catch {
          // The market value falls back to a known rate when the quotation service is unavailable.
        }

        const views = (await Promise.all(
          cards.map(async (collection) => {
            const pokemon = collection.pokemonData ?? await getPokemonCached(collection.pokemonCardId);
            if (pokemon && !collection.pokemonData) {
              try {
                await savePokemonSnapshotToSupabase(collection.id, pokemon);
              } catch (error) {
                console.warn("Unable to save Pokémon card snapshot:", error);
              }
            }
            return pokemon ? { collection, pokemon } : null;
          })
        )).filter((item): item is CollectionView => item !== null);

        const totals = views.reduce(
          (current, { collection, pokemon }) => {
            current.invested += collection.acquisitionValue ?? 0;
            current.market += collection.ligaValue && collection.ligaValue > 0
              ? collection.ligaValue
              : getMarketPriceUsd(pokemon) * dollarRate || collection.acquisitionValue || 0;
            return current;
          },
          { invested: 0, market: 0 }
        );

        if (!cancelled) {
          setCollectionView(views);
          setTotalInvestido(totals.invested);
          setValorMercado(totals.market);
        }
      } catch (error) {
        console.error("Unable to prepare collection data:", error);
        if (!cancelled) {
          setCollectionView([]);
          setTotalInvestido(0);
          setValorMercado(0);
        }
      } finally {
        if (!cancelled) setCarregandoValores(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [cards]);

  const uniquePokemon = new Set<number>();
  collectionView.forEach((item) => {
    item.pokemon.nationalPokedexNumbers?.forEach((number) => uniquePokemon.add(number));
  });

  const totalPokemon = 1025;
  const pokedexCount = uniquePokemon.size;

  return {
    collectionView,
    totalCards: collectionView.length,
    totalInvestido,
    valorMercado,
    lucroPrejuizo: valorMercado - totalInvestido,
    carregandoValores,
    pokedexCount,
    totalPokemon,
    pokedexProgress: Number(((pokedexCount / totalPokemon) * 100).toFixed(1)),
    removeCard,
  };
}
