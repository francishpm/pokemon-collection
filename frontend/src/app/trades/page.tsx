"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CardImage } from "@/components/collection/CardImage";
import { Search, Trash2, Pencil, Plus, ArrowLeftRight, Check, X, ExternalLink, RotateCcw, FileDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TradeStatus, useTrades } from "@/hooks/useTrades";
import { useUiStore } from "@/store/uiStore";
import { TradeShareButton } from "@/components/trades/TradeShareButton";
import { filterAndSortTrades } from "@/lib/tradeFilters";
import { getLigaPokemonUrl } from "@/lib/ligaPokemon";
import { TradeQuantityInput } from "@/components/trades/TradeQuantityInput";
import { TradeVariantInput } from "@/components/trades/TradeVariantInput";
import { TradeVariantBadge } from "@/components/trades/TradeVariantBadge";
import { isValidTradeQuantity } from "@/lib/tradeQuantity";

export default function TradesPage() {
    const { tradesView, loading, removeTrade, updateTradeDetails, fetchTrades, resetReviews } = useTrades();
    const [resetReviewOpen, setResetReviewOpen] = useState(false);
    const [resettingReviews, setResettingReviews] = useState(false);
    const activeReviewTrades = tradesView.filter(({ trade }) => trade.status !== "completed");
    const reviewedCount = activeReviewTrades.filter(({ trade }) => trade.reviewed).length;
    const searchParams = useSearchParams();
    const openSearchModal = useUiStore((state) => state.openSearchModal);
    const [localSearch, setLocalSearch] = useState("");
    const [sortBy, setSortBy] = useState("recent");
    const [reviewFilter, setReviewFilter] = useState<"all" | "reviewed" | "unreviewed">("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState<"active" | TradeStatus>("active");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [savingTradeId, setSavingTradeId] = useState<string | null>(null);
    const [tempPrice, setTempPrice] = useState<string>("");
    const [tempQuantity, setTempQuantity] = useState("1");
    const [tempVariant, setTempVariant] = useState("");
    const validQuantity = isValidTradeQuantity(Number(tempQuantity));
    const [tempStatus, setTempStatus] = useState<TradeStatus>("available");
    const interestIds = useMemo(() => (searchParams.get("interest") ?? "").split(",").filter(Boolean), [searchParams]);
    const [interestSelected, setInterestSelected] = useState<string[]>(() => interestIds);
    const editingTrade = tradesView.find(({ trade }) => trade.id === editingId);
    const deletingTrade = tradesView.find(({ trade }) => trade.id === deletingId);
    const completingTrade = tradesView.find(({ trade }) => trade.id === completingId);
    const getStatus = (status?: TradeStatus): TradeStatus => status ?? "available";
    const statusCounts = useMemo(() => ({
        active: tradesView.filter(({ trade }) => getStatus(trade.status) !== "completed").length,
        available: tradesView.filter(({ trade }) => getStatus(trade.status) === "available").length,
        reserved: tradesView.filter(({ trade }) => getStatus(trade.status) === "reserved").length,
        completed: tradesView.filter(({ trade }) => getStatus(trade.status) === "completed").length,
    }), [tradesView]);
    const hasActiveFilters = reviewFilter !== "all" || Boolean(localSearch.trim()) || priceFilter !== "all" || sortBy !== "recent" || statusFilter !== "active";
    
    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    const interestTrades = tradesView.filter(({ trade }) => interestSelected.includes(trade.id) && getStatus(trade.status) !== "completed");
    const confirmInterestRemoval = async () => {
        await Promise.all(interestSelected.map((id) => removeTrade(id)));
        setInterestSelected([]);
        window.history.replaceState({}, "", "/trades");
    };

    const filteredTrades = useMemo(() => {
        return filterAndSortTrades(tradesView, { search: localSearch, sortBy, priceFilter, statusFilter, reviewFilter });
    }, [tradesView, localSearch, priceFilter, sortBy, statusFilter, reviewFilter]);

    const clearFilters = () => {
        setReviewFilter("all");
        setLocalSearch("");
        setSortBy("recent");
        setPriceFilter("all");
        setStatusFilter("active");
    };

    const saveTradeDetails = async (tradeId: string) => {
        if (savingTradeId || !validQuantity) return;
        setSavingTradeId(tradeId);
        const num = parseFloat(tempPrice.replace(",", "."));
        try {
            const saved = await updateTradeDetails(tradeId, isNaN(num) ? null : num, tempStatus, Number(tempQuantity), tempVariant);
            if (saved) {
                setEditingId(null);
                setCompletingId(null);
            }
        } finally {
            setSavingTradeId(null);
        }
    };

    const handleSaveTrade = (tradeId: string) => {
        const previousStatus = getStatus(tradesView.find(({ trade }) => trade.id === tradeId)?.trade.status);
        if (tempStatus === "completed" && previousStatus !== "completed") {
            setCompletingId(tradeId);
            return;
        }
        void saveTradeDetails(tradeId);
    };

    const handleConfirmRemoval = async () => {
        if (!deletingId) return;
        await removeTrade(deletingId);
        setDeletingId(null);
    };

    return (
        <div className="space-y-8">
            {interestIds.length > 0 && interestTrades.length > 0 && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div><h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Check className="text-blue-500" size={20} />Pedido de interesse recebido</h2><p className="mt-1 text-sm text-muted-foreground">Revise as cartas selecionadas. Desmarque as que devem continuar na vitrine.</p></div>
                        <Button variant="ghost" size="icon" onClick={() => { setInterestSelected([]); window.history.replaceState({}, "", "/trades"); }}><X size={18} /></Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">{interestTrades.map(({ trade, pokemon }) => <button key={trade.id} type="button" onClick={() => setInterestSelected((current) => current.includes(trade.id) ? current.filter((id) => id !== trade.id) : [...current, trade.id])} className={`rounded-lg border px-3 py-2 text-left text-xs transition ${interestSelected.includes(trade.id) ? "border-blue-500 bg-blue-500/10" : "border-border opacity-50"}`}><span className="font-bold">{pokemon.name}</span><span className="ml-2 text-muted-foreground">{trade.price != null ? trade.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Troca"}</span></button>)}</div>
                    <div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm font-semibold">{interestSelected.length} selecionada(s) para remoção</p><Button disabled={!interestSelected.length} onClick={() => void confirmInterestRemoval()} className="bg-blue-600 text-white hover:bg-blue-700">Confirmar e remover</Button></div>
                </div>
            )}
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
                    <span className="mt-2 inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-500">
                        {statusCounts.active} {statusCounts.active === 1 ? "carta ativa" : "cartas ativas"}
                    </span>
                </div>

                <div className="flex gap-2">
                    <Link href={`/trades/print?${new URLSearchParams({ search: localSearch, sortBy, priceFilter, statusFilter, reviewFilter }).toString()}`} target="_blank" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
                        <FileDown size={18} />
                        <span className="hidden sm:inline">Gerar PDF</span>
                    </Link>
                    <TradeShareButton />
                    <Button onClick={() => openSearchModal("trades")} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar para Troca
                    </Button>
                </div>
            </div>

            {/* Busca, filtros e ordenação */}
            <div className="space-y-3 rounded-xl border bg-card p-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(170px,1fr)_160px_150px_160px_auto_auto]">
                    <div className="relative min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            placeholder="Pesquisar cartas..."
                            aria-label="Pesquisar cartas para troca"
                            className="h-11 border-border bg-background pl-10 text-foreground"
                            value={localSearch}
                            onChange={(event) => setLocalSearch(event.target.value)}
                        />
                    </div>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm" aria-label="Ordenar cartas">
                        <option value="recent">Mais recentes</option>
                        <option value="name">Nome (A–Z)</option>
                        <option value="set">Coleção (A–Z)</option>
                        <option value="price_asc">Menor preço</option>
                        <option value="price_desc">Maior preço</option>
                    </select>
                    <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filtrar por preço">
                        <option value="all">Todos os anúncios</option>
                        <option value="priced">Com preço</option>
                        <option value="trade_only">Apenas troca</option>
                    </select>
                    <select value={reviewFilter} disabled={statusFilter === "completed"} onChange={(event) => setReviewFilter(event.target.value as typeof reviewFilter)} className="h-11 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50" aria-label="Filtrar por revisão">
                        <option value="all">Todas as revisões</option>
                        <option value="unreviewed">Não revisadas</option>
                        <option value="reviewed">Revisadas</option>
                    </select>
                    <Button variant="outline" className="h-11 gap-2" disabled={!hasActiveFilters} onClick={clearFilters}>
                        <RotateCcw size={15} /> Limpar filtros
                    </Button>
                    <Button variant="outline" className="h-11 gap-2" disabled={loading || resettingReviews || !reviewedCount || Boolean(savingTradeId)} onClick={() => setResetReviewOpen(true)}>
                        <RotateCcw size={15} /> Reiniciar revisão
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <p className="font-medium">Exibindo {filteredTrades.length} de {tradesView.length} cartas</p>
                    <span aria-hidden="true">·</span>
                    <p title="Revisão das cartas disponíveis e reservadas">{reviewedCount} {reviewedCount === 1 ? "revisada" : "revisadas"} · {activeReviewTrades.length - reviewedCount} {activeReviewTrades.length - reviewedCount === 1 ? "não revisada" : "não revisadas"}</p>
                </div>

                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status das negociações">
                    {([
                        ["active", "Ativas", statusCounts.active],
                        ["available", "Disponíveis", statusCounts.available],
                        ["reserved", "Reservadas", statusCounts.reserved],
                        ["completed", "Concluídas", statusCounts.completed],
                    ] as const).map(([value, label, count]) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === value}
                            onClick={() => setStatusFilter(value)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${statusFilter === value ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
                        >
                            {label} ({count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Cartas */}
            {loading ? (
                <p className="text-center text-muted-foreground mt-10">Carregando cartas de troca...</p>
            ) : tradesView.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <h2 className="text-xl font-semibold text-foreground">Nenhuma carta à venda ou troca</h2>
                    <p className="mt-2 text-muted-foreground">Clique em &quot;Adicionar para Troca&quot; para selecionar cartas.</p>
                </div>
            ) : filteredTrades.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card p-12 text-center">
                    <h2 className="text-lg font-semibold">Nenhuma carta encontrada</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Altere a busca ou limpe os filtros para ver suas cartas.</p>
                    <Button variant="outline" className="mt-4 gap-2" onClick={clearFilters}><RotateCcw size={15} /> Limpar filtros</Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                    {filteredTrades.map(({ trade, pokemon }) => {
                        const status = getStatus(trade.status);
                        const statusStyle = status === "reserved" ? "bg-amber-100 text-amber-800" : status === "completed" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800";
                        const statusLabel = status === "reserved" ? "Reservada" : status === "completed" ? "Concluída" : "Disponível";
                        return (
                        <div key={trade.id} className={`group relative rounded-xl border bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${status === "completed" ? "opacity-75" : ""}`}>

                            <span className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-black uppercase shadow-sm ${statusStyle}`}>{statusLabel}</span>

                            {/* BOTÕES FLUTUANTES (Aparecem no Hover) */}
                            <div className="absolute right-3 top-3 z-10 flex gap-2 rounded-full bg-black/50 p-2 opacity-100 backdrop-blur-sm transition-all duration-300 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full border-0 bg-white/20 text-white hover:bg-white/30"
                                    onClick={() => { setEditingId(trade.id); setTempPrice(trade.price != null ? trade.price.toString() : ""); setTempStatus(status); setTempQuantity(String(trade.quantity ?? 1)); setTempVariant(trade.variant_label ?? ""); }}
                                    aria-label={`Editar ${pokemon.name}`}
                                    title="Editar carta"
                                >
                                    <Pencil size={15} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full border-0 bg-red-500/20 text-red-200 hover:bg-red-500/40"
                                    onClick={() => setDeletingId(trade.id)}
                                    aria-label={`Remover ${pokemon.name} das trocas`}
                                    title="Remover das trocas"
                                >
                                    <Trash2 size={15} />
                                </Button>
                            </div>

                            {/* IMAGEM E INFORMAÇÕES */}
                            <div>
                                <CardImage src={pokemon.images.small} fallbackSrc={pokemon.images.large} alt={pokemon.name} width={245} height={342} className="mx-auto h-40 md:h-52 w-full object-contain transition-transform duration-300 group-hover:scale-105" />

                                <div className="mt-3 flex flex-col items-center gap-1 text-center">
                                    <h3 className="line-clamp-2 h-11 text-base font-bold leading-5">{pokemon.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        #{pokemon.number}/{pokemon.set.printedTotal} • {pokemon.set.name}
                                    </p>

                                    {/* BADGES IDIOMA E CONDIÇÃO */}
                                    <div className="flex flex-wrap justify-center gap-2 mt-1">
                                        {status !== "completed" && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${trade.reviewed ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"}`}>{trade.reviewed ? "Revisada" : "Não revisada"}</span>}
                                        <TradeVariantBadge label={trade.variant_label} />
                                        {(trade.quantity ?? 1) > 1 && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700" aria-label={`${trade.quantity} unidades`}>{trade.quantity}×</span>}
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
                                <span className="inline-flex rounded-full bg-green-100 dark:bg-emerald-900/30 px-3 py-1 text-sm font-bold text-green-700 dark:text-emerald-400">
                                    {trade.price ? trade.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Apenas troca"}
                                </span>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={resetReviewOpen} onOpenChange={(open) => { if (!resettingReviews) setResetReviewOpen(open); }}>
                <DialogContent className="sm:max-w-md" showCloseButton={!resettingReviews}>
                    <DialogHeader>
                        <DialogTitle>Reiniciar a revisão das trocas?</DialogTitle>
                        <DialogDescription>Suas cartas disponíveis e reservadas voltarão para “Não revisadas”, independentemente dos filtros. As concluídas permanecerão no histórico, fora da revisão. As cartas, preços e quantidades serão mantidos.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" disabled={resettingReviews} onClick={() => setResetReviewOpen(false)}>Cancelar</Button>
                        <Button disabled={resettingReviews} onClick={async () => {
                            if (resettingReviews) return;
                            setResettingReviews(true);
                            try {
                                if (await resetReviews()) {
                                    clearFilters();
                                    setResetReviewOpen(false);
                                }
                            } finally { setResettingReviews(false); }
                        }}>
                            {resettingReviews && <Loader2 className="animate-spin" />}
                            {resettingReviews ? "Reiniciando..." : "Reiniciar revisão"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editingTrade !== undefined && completingTrade === undefined} onOpenChange={(open) => !open && setEditingId(null)}>
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
                    {editingTrade && (() => {
                        const { trade, pokemon } = editingTrade;
                        const ligaUrl = pokemon.prizePack?.source ?? getLigaPokemonUrl(
                            pokemon.name,
                            pokemon.number,
                            pokemon.set.printedTotal,
                            pokemon.set.ligaEdition,
                            pokemon.set.printedTotalLabel,
                            pokemon.set.name,
                        );

                        return (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Editar carta para troca</DialogTitle>
                                    <DialogDescription>Atualize a quantidade, o status e o preço por unidade ou consulte a carta na Liga Pokémon.</DialogDescription>
                                </DialogHeader>

                                <div className="flex items-center gap-4 rounded-xl border bg-card p-3">
                                    <CardImage src={pokemon.images.small} fallbackSrc={pokemon.images.large} alt={pokemon.name} width={120} height={168} className="h-36 w-24 shrink-0 rounded object-contain drop-shadow-md" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-bold">{pokemon.name}</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {pokemon.set.name} • #{pokemon.number}/{pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{trade.condition || "NM"}</span>
                                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{trade.language || "PT"}</span>
                                            {pokemon.rarity && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{pokemon.rarity}</span>}
                                        </div>
                                    </div>
                                </div>

                                <fieldset className="space-y-2">
                                    <legend className="text-sm font-semibold">Status da negociação</legend>
                                    <div className="grid grid-cols-3 gap-2">
                                        {([
                                            ["available", "Disponível"],
                                            ["reserved", "Reservada"],
                                            ["completed", "Concluída"],
                                        ] as const).map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                aria-pressed={tempStatus === value}
                                                onClick={() => setTempStatus(value)}
                                                className={`rounded-md border px-2 py-2 text-xs font-semibold transition-colors ${tempStatus === value ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background hover:border-blue-500"}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {tempStatus === "available" ? "Visível e pronta para receber propostas." : tempStatus === "reserved" ? "Continua visível, mas indica que já existe uma negociação." : "Sai da vitrine pública e permanece no seu histórico."}
                                    </p>
                                </fieldset>

                                <TradeQuantityInput id="trade-quantity" value={tempQuantity} onChange={setTempQuantity} />
                                <TradeVariantInput id="trade-variant" value={tempVariant} onChange={setTempVariant} />
                                <div className="space-y-2">
                                    <label htmlFor="trade-price" className="text-sm font-semibold">Valor por unidade</label>
                                    <Input
                                        id="trade-price"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Ex.: 25,90"
                                        value={tempPrice}
                                        onChange={(event) => setTempPrice(event.target.value)}
                                        autoFocus
                                    />
                                    <p className="text-xs text-muted-foreground">Deixe vazio para anunciar como apenas troca.</p>
                                </div>

                                <a href={ligaUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400">
                                    {pokemon.prizePack ? "Consultar versão Prize Pack" : "Pesquisar esta carta na Liga Pokémon"}
                                    <ExternalLink size={16} />
                                </a>

                                {tempStatus !== "completed" && <p className="text-xs text-muted-foreground">Ao salvar, esta carta será marcada como revisada, mesmo sem alterar os campos.</p>}
                                <DialogFooter>
                                    <Button className="w-full" disabled={savingTradeId === trade.id || !validQuantity} onClick={() => handleSaveTrade(trade.id)}>
                                        {savingTradeId === trade.id && <Loader2 className="animate-spin" />}
                                        {savingTradeId === trade.id ? "Salvando..." : "Salvar alterações"}
                                    </Button>
                                </DialogFooter>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <Dialog open={completingTrade !== undefined} onOpenChange={(open) => !open && !savingTradeId && setCompletingId(null)}>
                <DialogContent className="sm:max-w-sm">
                    {completingTrade && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Concluir esta negociação?</DialogTitle>
                                <DialogDescription>
                                    {completingTrade.pokemon.name} será removida da vitrine pública, mas continuará no histórico e poderá ser restaurada depois.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" disabled={savingTradeId === completingTrade.trade.id} onClick={() => setCompletingId(null)}>Cancelar</Button>
                                <Button disabled={savingTradeId === completingTrade.trade.id} onClick={() => void saveTradeDetails(completingTrade.trade.id)}>
                                    {savingTradeId === completingTrade.trade.id && <Loader2 className="animate-spin" />}
                                    {savingTradeId === completingTrade.trade.id ? "Concluindo..." : "Concluir negociação"}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={deletingTrade !== undefined} onOpenChange={(open) => !open && setDeletingId(null)}>
                <DialogContent className="sm:max-w-sm">
                    {deletingTrade && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Remover carta das trocas?</DialogTitle>
                                <DialogDescription>Esta ação remove a carta da sua vitrine de trocas.</DialogDescription>
                            </DialogHeader>

                            <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                                <CardImage src={deletingTrade.pokemon.images.small} fallbackSrc={deletingTrade.pokemon.images.large} alt={deletingTrade.pokemon.name} width={80} height={112} className="h-24 w-16 shrink-0 rounded object-contain" />
                                <div className="min-w-0">
                                    <h3 className="font-bold">{deletingTrade.pokemon.name}</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {deletingTrade.pokemon.set.name} • #{deletingTrade.pokemon.number}/{deletingTrade.pokemon.set.printedTotalLabel ?? deletingTrade.pokemon.set.printedTotal}
                                    </p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
                                <Button variant="destructive" onClick={() => void handleConfirmRemoval()}>Remover das trocas</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
