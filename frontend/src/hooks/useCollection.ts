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

export function useCollection() {
  const { cards, removeCard } = useCollectionStore();
  const [collectionView, setCollectionView] = useState<CollectionView[]>([]);
  const [totalInvestido, setTotalInvestido] = useState(0);
  const [valorMercado, setValorMercado] = useState(0);
  const [pricedCardsCount, setPricedCardsCount] = useState(0);
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
          setPricedCardsCount(0);
          setCarregandoValores(false);
        }
        return;
      }

      if (!cancelled) setCarregandoValores(true);

      try {
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
          (current, { collection }) => {
            current.invested += collection.acquisitionValue ?? 0;
            const manualMarketValue = collection.ligaValue ?? 0;
            const marketValue = manualMarketValue;

            current.market += marketValue;
            if (marketValue > 0) current.priced += 1;
            return current;
          },
          { invested: 0, market: 0, priced: 0 }
        );

        if (!cancelled) {
          setCollectionView(views);
          setTotalInvestido(totals.invested);
          setValorMercado(totals.market);
          setPricedCardsCount(totals.priced);
        }
      } catch (error) {
        console.error("Unable to prepare collection data:", error);
        if (!cancelled) {
          setCollectionView([]);
          setTotalInvestido(0);
          setValorMercado(0);
          setPricedCardsCount(0);
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
    pricedCardsCount,
    priceCoverage: collectionView.length > 0
      ? Number(((pricedCardsCount / collectionView.length) * 100).toFixed(1))
      : 0,
    lucroPrejuizo: valorMercado - totalInvestido,
    carregandoValores,
    pokedexCount,
    totalPokemon,
    pokedexProgress: Number(((pokedexCount / totalPokemon) * 100).toFixed(1)),
    removeCard,
  };
}
