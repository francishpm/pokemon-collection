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
    const { cards, removeCard } = useCollectionStore();

    const [collectionView, setCollectionView] = useState<CollectionView[]>([]);
    
    // NOSSOS NOVOS ESTADOS FINANCEIROS
    const [totalInvestido, setTotalInvestido] = useState(0);
    const [valorMercado, setValorMercado] = useState(0);
    const [carregandoValores, setCarregandoValores] = useState(true);

    useEffect(() => {
        const load = async () => {
            setCarregandoValores(true);
            try {
                // 1. Busca as cartas no cache/API
                const data = await Promise.all(
                    cards.map(async (collection) => {
                        const pokemon = await getPokemonCached(collection.pokemonCardId);
                        if (!pokemon) return null;
                        return { collection, pokemon };
                    })
                );

                const validCards = data.filter((item): item is CollectionView => item !== null);
                setCollectionView(validCards);

                // 2. Busca a cotação do dólar para conversão em tempo real
                let dolarAtual = 5.00; // Fallback de segurança
                try {
                    const cotacaoRes = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
                    const cotacaoData = await cotacaoRes.json();
                    dolarAtual = parseFloat(cotacaoData.USDBRL.ask);
                } catch (e) {
                    console.error("Falha ao buscar cotação, usando fallback.");
                }

                // 3. Faz a matemática da Regra do Híbrido
                let somaInvestido = 0;
                let somaMercado = 0;

                validCards.forEach(({ collection, pokemon }) => {
                    const pago = collection.acquisitionValue ?? 0;
                    somaInvestido += pago;

                    // MÁGICA NOVA: Se tem valor da Liga, usa ele e ignora o resto!
                    if (collection.ligaValue && collection.ligaValue > 0) {
                        somaMercado += collection.ligaValue;
                    } else {
                        // Se não tem valor da liga, tenta a API gringa
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
                        
                        // O TRUQUE DE MESTRE: Se a API for zero, usamos o valor pago temporariamente para não afundar o gráfico
                        somaMercado += precoConvertido > 0 ? precoConvertido : pago;
                    }
                });

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