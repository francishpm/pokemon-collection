import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { CollectionCard } from "@/types/collection-card";
import { useCollectionStore } from "@/store/collectionStore";
import { getPokemonCached } from "@/services/pokemonCache";

export interface CollectionView {
    collection: CollectionCard;
    pokemon: PokemonCard;
}

// Memória Global
let globalCollectionView: CollectionView[] = [];
let globalTotalInvestido = 0;
let globalValorMercado = 0;
let lastCardsHash = ""; // Agora ele grava a "assinatura" exata dos dados

export function useCollection() {
    const { cards, removeCard } = useCollectionStore();

    const [collectionView, setCollectionView] = useState<CollectionView[]>(globalCollectionView);
    const [totalInvestido, setTotalInvestido] = useState(globalTotalInvestido);
    const [valorMercado, setValorMercado] = useState(globalValorMercado);
    
    const [carregandoValores, setCarregandoValores] = useState(globalCollectionView.length === 0);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            // Cria uma "assinatura" dos dados atuais (se o preço mudar, a assinatura muda)
            const currentHash = JSON.stringify(cards);

            // 1. TENTA RECUPERAR DA SESSÃO
            if (globalCollectionView.length === 0) {
                const sessionData = sessionStorage.getItem("carddex_dashboard_cache");
                if (sessionData) {
                    const parsed = JSON.parse(sessionData);
                    // Só usa o cache se absolutamente nenhum dado da carta mudou
                    if (parsed.cardsHash === currentHash) {
                        globalCollectionView = parsed.collectionView;
                        globalTotalInvestido = parsed.totalInvestido;
                        globalValorMercado = parsed.valorMercado;
                        lastCardsHash = parsed.cardsHash;
                        
                        if (isMounted) {
                            setCollectionView(globalCollectionView);
                            setTotalInvestido(globalTotalInvestido);
                            setValorMercado(globalValorMercado);
                            setCarregandoValores(false);
                        }
                        return; 
                    }
                }
            }

            // Se nada mudou desde a última vez que renderizou, ignora o recálculo
            if (currentHash === lastCardsHash && globalCollectionView.length > 0) {
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
                    
                    const tempoInicio = performance.now();

                    const promessas = lote.map(async (collection) => {
                        const pokemon = await getPokemonCached(collection.pokemonCardId);
                        if (!pokemon) return null;
                        return { collection, pokemon };
                    });
                    
                    const resultadosLote = await Promise.all(promessas);
                    
                    const tempoDecorrido = performance.now() - tempoInicio;

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

                    if (isMounted) {
                        setCollectionView(acumuladoCards);
                        setTotalInvestido(somaInvestido);
                        setValorMercado(somaMercado);
                    }

                    if (i + BATCH_SIZE < cards.length && tempoDecorrido > 100) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                globalCollectionView = acumuladoCards;
                globalTotalInvestido = somaInvestido;
                globalValorMercado = somaMercado;
                lastCardsHash = currentHash; // Grava a assinatura exata

                // Salva na sessão usando a assinatura
                sessionStorage.setItem("carddex_dashboard_cache", JSON.stringify({
                    collectionView: globalCollectionView,
                    totalInvestido: globalTotalInvestido,
                    valorMercado: globalValorMercado,
                    cardsHash: lastCardsHash
                }));

            } catch (error) {
                console.error("Erro no useCollection:", error);
            } finally {
                if (isMounted) setCarregandoValores(false);
            }
        };

        if (cards.length > 0) {
            load();
        } else {
            if (isMounted) setCarregandoValores(false);
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