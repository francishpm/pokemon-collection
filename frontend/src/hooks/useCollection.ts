import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { CollectionCard } from "@/types/collection-card";
import { useCollectionStore } from "@/store/collectionStore";
import { getPokemonCached } from "@/services/pokemonCache";

export interface CollectionView {
    collection: CollectionCard;
    pokemon: PokemonCard;
}

// --- VARIÁVEIS GLOBAIS EM MEMÓRIA ---
// Isso evita que a tela zere toda vez que você trocar de página
let globalCollectionView: CollectionView[] = [];
let globalTotalInvestido = 0;
let globalValorMercado = 0;
let alreadyLoaded = false;
let lastCardsLength = -1;

export function useCollection() {
    const { cards, removeCard } = useCollectionStore();

    // Iniciamos os estados já com os valores globais em vez de começar do zero
    const [collectionView, setCollectionView] = useState<CollectionView[]>(globalCollectionView);
    const [totalInvestido, setTotalInvestido] = useState(globalTotalInvestido);
    const [valorMercado, setValorMercado] = useState(globalValorMercado);
    const [carregandoValores, setCarregandoValores] = useState(!alreadyLoaded);

    useEffect(() => {
        const load = async () => {
            // Se as cartas não mudaram de quantidade e já carregamos, não faz de novo!
            if (alreadyLoaded && cards.length === lastCardsLength) {
                setCarregandoValores(false);
                return;
            }

            setCarregandoValores(true);
            try {
                const data: (CollectionView | null)[] = [];

                // 1. BUSCA EM LOTES PARA PROTEGER A API
                // Ao invés de mandar 44 pedidos de uma vez, mandamos de 5 em 5
                const BATCH_SIZE = 5;
                for (let i = 0; i < cards.length; i += BATCH_SIZE) {
                    const lote = cards.slice(i, i + BATCH_SIZE);
                    const promessas = lote.map(async (collection) => {
                        const pokemon = await getPokemonCached(collection.pokemonCardId);
                        if (!pokemon) return null;
                        return { collection, pokemon };
                    });
                    
                    const resultadosLote = await Promise.all(promessas);
                    data.push(...resultadosLote);
                    
                    // Pausa de 500ms entre os lotes para a API do Pokémon não bloquear a gente
                    if (i + BATCH_SIZE < cards.length) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                const validCards = data.filter((item): item is CollectionView => item !== null);

                // 2. BUSCA O DÓLAR
                let dolarAtual = 5.00;
                try {
                    const cotacaoRes = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
                    const cotacaoData = await cotacaoRes.json();
                    dolarAtual = parseFloat(cotacaoData.USDBRL.ask);
                } catch (e) {
                    console.error("Falha ao buscar cotação, usando fallback.");
                }

                // 3. MATEMÁTICA
                let somaInvestido = 0;
                let somaMercado = 0;

                validCards.forEach(({ collection, pokemon }) => {
                    const pago = collection.acquisitionValue ?? 0;
                    somaInvestido += pago;

                    if (collection.ligaValue && collection.ligaValue > 0) {
                        somaMercado += collection.ligaValue;
                    } else {
                        let precoGlobalUsd = 0;
                        const prices = pokemon.tcgplayer?.prices;

                        if (prices) {
                            for (const key in prices) {
                                if (prices[key]?.market) {
                                    precoGlobalUsd = prices[key].market;
                                    break;
                                } else if (prices[key]?.mid && precoGlobalUsd === 0) {
                                    precoGlobalUsd = prices[key].mid;
                                } else if (prices[key]?.low && precoGlobalUsd === 0) {
                                    precoGlobalUsd = prices[key].low;
                                }
                            }
                        }

                        const precoConvertido = precoGlobalUsd * dolarAtual;
                        somaMercado += precoConvertido > 0 ? precoConvertido : pago;
                    }
                });

                // 4. ATUALIZA O CACHE GLOBAL PARA NÃO SUMIR MAIS
                globalCollectionView = validCards;
                globalTotalInvestido = somaInvestido;
                globalValorMercado = somaMercado;
                alreadyLoaded = true;
                lastCardsLength = cards.length;

                // 5. ATUALIZA A TELA
                setCollectionView(validCards);
                setTotalInvestido(somaInvestido);
                setValorMercado(somaMercado);

            } catch (error) {
                console.error("Erro no useCollection:", error);
            } finally {
                setCarregandoValores(false);
            }
        };

        load();
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