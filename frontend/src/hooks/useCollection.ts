import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { CollectionCard } from "@/types/collection-card";
import { useCollectionStore } from "@/store/collectionStore";
import { getPokemonCached } from "@/services/pokemonCache";

export interface CollectionView {
    collection: CollectionCard;
    pokemon: PokemonCard;
}

export function useCollection() {
    const {
        cards,
        removeCard,
    } = useCollectionStore();

    const [collectionView, setCollectionView] = useState<
        CollectionView[]
    >([]);

    useEffect(() => {
        const load = async () => {
            console.time("useCollection");
            try {
                console.log("Carregando coleção...");

                const data = await Promise.all(
                    cards.map(async (collection) => {
                        console.log("Buscando", collection.pokemonCardId);

                        const pokemon = await getPokemonCached(
                            collection.pokemonCardId
                        );

                        if (!pokemon) return null;

                        return {
                            collection,
                            pokemon,
                        };
                    })
                );

                console.log("Resultado:", data);

                setCollectionView(
                    data.filter(
                        (item): item is CollectionView => item !== null
                    )
                );
            } catch (error) {
                console.error("Erro no useCollection:", error);
            } finally {
                console.timeEnd("useCollection");
            }
        };

        load();
    }, [cards]);
    const totalCards = collectionView.length;

    const totalValue = collectionView.reduce(
        (total, item) => total + (item.collection.acquisitionValue ?? 0),
        0
    );

    const uniquePokemon = new Set<number>();

    collectionView.forEach((item) => {
        item.pokemon.nationalPokedexNumbers?.forEach((number) => {
            uniquePokemon.add(number);
        });
    });

    const pokedexCount = uniquePokemon.size;

    const totalPokemon = 1025;

    const pokedexProgress = Number(
        ((pokedexCount / totalPokemon) * 100).toFixed(1)
    );

    return {
        collectionView,
        totalCards,
        totalValue,

        pokedexCount,
        totalPokemon,
        pokedexProgress,

        removeCard,
    };
}