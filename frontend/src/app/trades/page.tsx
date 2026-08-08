"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { Search, Trash2, Pencil, Plus, ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTrades } from "@/hooks/useTrades";
import { useUiStore } from "@/store/uiStore";
import { TradeShareButton } from "@/components/trades/TradeShareButton";

export default function TradesPage() {
    const { tradesView, loading, removeTrade, updatePrice, fetchTrades } = useTrades();
    const openSearchModal = useUiStore((state) => state.openSearchModal);
    const [localSearch, setLocalSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempPrice, setTempPrice] = useState<string>("");
    
    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    const filteredTrades = useMemo(() => {
        const term = localSearch.trim().toLowerCase();
        if (!term) return tradesView;

        return tradesView.filter(({ pokemon }) => {
            const fullNumber = `${pokemon.number}/${pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal}`.toLowerCase();
            return (
                pokemon.name.toLowerCase().includes(term) ||
                pokemon.number.toLowerCase().includes(term) ||
                fullNumber.includes(term) ||
                pokemon.set.name.toLowerCase().includes(term)
            );
        });
    }, [tradesView, localSearch]);

    const handleSavePrice = (tradeId: string) => {
        const num = parseFloat(tempPrice.replace(",", "."));
        updatePrice(tradeId, isNaN(num) ? null : num);
        setEditingId(null);
    };

    return (
        <div className="space-y-8">
            {/* Cabeçalho */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <ArrowLeftRight className="text-blue-500" size={32} />
                        Área de Trocas e Vendas
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie as cartas excedentes que você deseja negociar.
                    </p>
                </div>

                <div className="flex gap-2">
                    <TradeShareButton />
                    <Button onClick={() => openSearchModal("trades")} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar para Troca
                    </Button>
                </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                    placeholder="Pesquisar nas suas cartas para troca..."
                    className="pl-10 h-11 bg-card text-foreground border-border"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                />
            </div>

            {/* Grid de Cartas */}
            {loading ? (
                <p className="text-center text-muted-foreground mt-10">Carregando cartas de troca...</p>
            ) : tradesView.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <h2 className="text-xl font-semibold text-foreground">Nenhuma carta à venda ou troca</h2>
                    <p className="mt-2 text-muted-foreground">Clique em &quot;Adicionar para Troca&quot; para selecionar cartas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                    {filteredTrades.map(({ trade, pokemon }) => (
                        <div key={trade.id} className="group relative cursor-pointer rounded-xl border bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between">

                            {/* BOTÕES FLUTUANTES (Aparecem no Hover) */}
                            <div className="absolute right-3 top-3 z-10 flex gap-2 rounded-full bg-black/50 p-2 backdrop-blur-sm opacity-0 transition-all duration-300 group-hover:opacity-100">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full border-0 bg-white/20 text-white hover:bg-white/30"
                                    onClick={() => { setEditingId(trade.id); setTempPrice(trade.price ? trade.price.toString() : ""); }}
                                >
                                    <Pencil size={15} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full border-0 bg-red-500/20 text-red-200 hover:bg-red-500/40"
                                    onClick={() => removeTrade(trade.id)}
                                >
                                    <Trash2 size={15} />
                                </Button>
                            </div>

                            {/* IMAGEM E INFORMAÇÕES */}
                            <div>
                                <Image src={pokemon.images.small} alt={pokemon.name} width={245} height={342} className="mx-auto h-40 md:h-52 w-full object-contain transition-transform duration-300 group-hover:scale-105" />

                                <div className="mt-3 flex flex-col items-center gap-1 text-center">
                                    <h3 className="line-clamp-2 h-11 text-base font-bold leading-5">{pokemon.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        #{pokemon.number}/{pokemon.set.printedTotal} • {pokemon.set.name}
                                    </p>

                                    {/* BADGES IDIOMA E CONDIÇÃO */}
                                    <div className="flex justify-center gap-2 mt-1">
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                            {trade.condition || "NM"}
                                        </span>
                                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                            {trade.language || "PT"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* PREÇO */}
                            <div className="mt-3 flex justify-center">
                                {editingId === trade.id ? (
                                    <div className="flex items-center gap-1 w-full">
                                        <Input
                                            type="text"
                                            placeholder="Preço R$"
                                            className="h-8 text-xs bg-background"
                                            value={tempPrice}
                                            onChange={(e) => setTempPrice(e.target.value)}
                                            autoFocus
                                        />
                                        <Button size="sm" className="h-8 text-xs px-2" onClick={() => handleSavePrice(trade.id)}>Salvar</Button>
                                    </div>
                                ) : (
                                    <span className="inline-flex rounded-full bg-green-100 dark:bg-emerald-900/30 px-3 py-1 text-sm font-bold text-green-700 dark:text-emerald-400">
                                        {trade.price ? trade.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Apenas troca"}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
