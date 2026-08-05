"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPokemonCached } from "@/services/pokemonCache";
import { PokemonCard } from "@/types/pokemon-card";
import { ArrowLeftRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TradeItem {
    id: string;
    user_id: string;
    card_id: string;
    price: number | null;
    condition?: string;
    language?: string;
}

interface TradeView {
    trade: TradeItem;
    pokemon: PokemonCard;
}

export default function PublicTradesPage() {
    const params = useParams();
    const userId = params.id as string; 

    const [trades, setTrades] = useState<TradeView[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchPublicTrades = async () => {
            if (!userId) return;
            
            try {
                const { data, error } = await supabase
                    .from("trades")
                    .select("*")
                    .eq("user_id", userId)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                if (data && data.length > 0) {
                    let acumuladoCards: TradeView[] = [];

                    // Busca todas em paralelo mas protegida contra falhas individuais
                    const promessas = data.map(async (trade) => {
                        try {
                            const pokemon = await getPokemonCached(trade.card_id);
                            if (!pokemon) return null;
                            return { trade, pokemon };
                        } catch (e) {
                            return null; // Se uma falhar, não derruba as outras
                        }
                    });

                    const resultados = await Promise.all(promessas);
                    acumuladoCards = resultados.filter((r): r is TradeView => r !== null);

                    if (isMounted) {
                        setTrades(acumuladoCards);
                        setLoading(false);
                    }
                } else {
                    if (isMounted) setLoading(false);
                }
            } catch (err) {
                console.error("Erro ao carregar vitrine:", err);
                if (isMounted) setLoading(false);
            }
        };

        fetchPublicTrades();

        // SEGURANÇA MÁXIMA: Se por algum motivo a API travar, em 2 segundos a tela é liberada à força
        const timer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 2000);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [userId]);

    const filteredTrades = trades.filter(({ pokemon }) => {
        if (!search) return true;
        return pokemon.name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 w-full absolute top-0 left-0 z-[100] overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Cabeçalho Público */}
                <div className="text-center space-y-2 mt-8">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-2">
                        <ArrowLeftRight className="text-blue-600 dark:text-blue-400" size={32} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        Vitrine de Trocas e Vendas
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                        Confira as cartas disponíveis para negócio. Achou algo legal? Entre em contato comigo para fechar acordo!
                    </p>
                </div>

                {/* Filtro */}
                <div className="max-w-md mx-auto relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Buscar carta na vitrine..."
                        className="pl-10 h-12 rounded-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Cartas */}
                {loading && trades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-12 gap-3 text-slate-500">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="animate-pulse font-medium">Arrumando a vitrine...</p>
                    </div>
                ) : trades.length === 0 && !loading ? (
                    <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-8">
                        <p className="text-slate-500 font-medium">Nenhuma carta disponível no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 mt-8">
                        {filteredTrades.map(({ trade, pokemon }) => (
                            <div key={trade.id} className="relative rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                <img src={pokemon.images.small} alt={pokemon.name} className="mx-auto h-40 md:h-52 w-full object-contain" />
                                
                                <div className="mt-3 flex flex-col items-center gap-1 text-center">
                                    <h3 className="line-clamp-2 h-11 text-sm font-bold leading-5">{pokemon.name}</h3>
                                    
                                    <div className="flex justify-center gap-2 mt-1">
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            {trade.condition || "NM"}
                                        </span>
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                            {trade.language || "PT"}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 flex justify-center">
                                    <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {trade.price ? trade.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Apenas troca"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}