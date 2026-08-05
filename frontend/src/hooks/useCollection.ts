import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { CollectionCard } from "@/types/collection-card";
import { useCollectionStore } from "@/store/collectionStore";
import { getPokemonCached } from "@/services/pokemonCache";

export interface CollectionView {
    collection: CollectionCard;
    pokemon: PokemonCard;
}

// Memória Global para não apagar quando trocar de tela
let globalCollectionView: CollectionView[] = [];
let globalTotalInvestido = 0;
let globalValorMercado = 0;
let lastCardsLength = -1;

export function useCollection() {
    const { cards, removeCard } = useCollectionStore();

    const [collectionView, setCollectionView] = useState<CollectionView[]>(globalCollectionView);
    const [totalInvestido, setTotalInvestido] = useState(globalTotalInvestido);
    const [valorMercado, setValorMercado] = useState(globalValorMercado);
    const [carregandoValores, setCarregandoValores] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            // Se já carregou tudo e a quantidade não mudou, usa a memória!
            if (cards.length === lastCardsLength && globalCollectionView.length === cards.length) {
                if (isMounted) setCarregandoValores(false);
                return;
            }

            if (isMounted) setCarregandoValores(true);

            try {
                let dolarAtual = 5.00;
                try {
                    const cotacaoRes = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
                    const cotacaoData = await cotacaoRes.json();
                    dolarAtual = parseFloat(cotacaoData.USDBRL.ask);
                } catch (e) {
                    console.error("Falha ao buscar cotação, usando fallback.");
                }

                let acumuladoCards: CollectionView[] = [];
                let somaInvestido = 0;
                let somaMercado = 0;

                const BATCH_SIZE = 5;
                for (let i = 0; i < cards.length; i += BATCH_SIZE) {
                    const lote = cards.slice(i, i + BATCH_SIZE);
                    
                    const promessas = lote.map(async (collection) => {
                        const pokemon = await getPokemonCached(collection.pokemonCardId);
                        if (!pokemon) return null;
                        return { collection, pokemon };
                    });
                    
                    const resultadosLote = await Promise.all(promessas);
                    const validosLote = resultadosLote.filter((item): item is CollectionView => item !== null);
                    
                    acumuladoCards = [...acumuladoCards, ...validosLote];

                    validosLote.forEach(({ collection, pokemon }) => {
                        const pago = collection.acquisitionValue ?? 0;
                        somaInvestido += pago;

                        if (collection.ligaValue && collection.ligaValue > 0) {
                            somaMercado += collection.ligaValue;
                        } else {
                            let precoGlobalUsd = 0;
                            const prices = pokemon.tcgplayer?.prices;
                            if (prices) {
                                for (const key in prices) {
                                    if (prices[key]?.market) { precoGlobalUsd = prices[key].market; break; }
                                    else if (prices[key]?.mid && precoGlobalUsd === 0) { precoGlobalUsd = prices[key].mid; }
                                    else if (prices[key]?.low && precoGlobalUsd === 0) { precoGlobalUsd = prices[key].low; }
                                }
                            }
                            const precoConvertido = precoGlobalUsd * dolarAtual;
                            somaMercado += precoConvertido > 0 ? precoConvertido : pago;
                        }
                    });

                    // A MÁGICA AQUI: Atualiza a tela a cada 5 cartas, dando a sensação visual de contagem
                    if (isMounted) {
                        setCollectionView(acumuladoCards);
                        setTotalInvestido(somaInvestido);
                        setValorMercado(somaMercado);
                    }

                    // Pausa para não irritar a API
                    if (i + BATCH_SIZE < cards.length) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                // Salva o resultado final na memória global
                globalCollectionView = acumuladoCards;
                globalTotalInvestido = somaInvestido;
                globalValorMercado = somaMercado;
                lastCardsLength = cards.length;

            } catch (error) {
                console.error("Erro no useCollection:", error);
            } finally {
                if (isMounted) setCarregandoValores(false);
            }
        };

        if (cards.length > 0) {
            load();
        } else {
            setCarregandoValores(false);
        }

        return () => { isMounted = false; };
    }, [cards]);

    const totalCards = collectionView.length;
    const lucroPrejuizo = valorMercado - totalInvestido;

    const uniquePokemon = new Set<number>();
    collectionView.forEach((item) => {
        item.pokemon.nationalPokedexNumbers?.forEach((number) => {
            uniquePokemon.add(number);
        });
    });

    const pokedexCount = uniquePokemon.size;
    const totalPokemon = 1025;
    const pokedexProgress = Number(((pokedexCount / totalPokemon) * 100).toFixed(1));

    return {
        collectionView,
        totalCards,
        totalInvestido,
        valorMercado,
        lucroPrejuizo,
        carregandoValores,
        pokedexCount,
        totalPokemon,
        pokedexProgress,
        removeCard,
    };
}