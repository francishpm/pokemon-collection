"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChartNoAxesCombined, ChevronRight, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useCollectionStore } from "@/store/collectionStore";
import { fetchPriceHistory } from "@/services/priceHistoryService";
import { PriceHistory } from "@/types/price.history";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function PriceHistoryPage() {
  const { collectionView } = useCollection();
  const fetchCards = useCollectionStore((state) => state.fetchCards);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchCards();
        const entries = await fetchPriceHistory();
        setHistory(entries);
        setSelectedCardId((current) => current ?? entries[0]?.collectionCardId ?? null);
      } catch (error) {
        console.error("Erro ao carregar histórico de preços:", error);
        const message = error instanceof Error ? error.message : "Erro desconhecido.";
        toast.error(`Não foi possível carregar o histórico: ${message}`);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [fetchCards]);

  const entriesByCard = useMemo(() => {
    const allEntries = new Map<string, PriceHistory[]>();
    for (const entry of history) {
      const entries = allEntries.get(entry.collectionCardId) ?? [];
      entries.push(entry);
      allEntries.set(entry.collectionCardId, entries);
    }
    return new Map(
      [...allEntries.entries()]
        .map(([cardId, entries]) => [cardId, entries.filter((entry) => entry.source === "manual")] as const)
        .filter(([, entries]) => entries.length > 0),
    );
  }, [history]);

  const cardsWithHistory = useMemo(() => collectionView
    .filter((item) => entriesByCard.has(item.collection.id))
    .sort((a, b) => a.pokemon.name.localeCompare(b.pokemon.name)), [collectionView, entriesByCard]);

  const selectedCard = collectionView.find((item) => item.collection.id === selectedCardId);
  const selectedEntries = selectedCardId ? (entriesByCard.get(selectedCardId) ?? []) : [];
  const chronologicalEntries = [...selectedEntries].reverse();
  const initialPrice = chronologicalEntries[0]?.price;
  const currentPrice = chronologicalEntries.at(-1)?.price;
  const difference = initialPrice !== undefined && currentPrice !== undefined ? currentPrice - initialPrice : 0;
  const filteredCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return cardsWithHistory;

    return cardsWithHistory.filter(({ pokemon }) =>
      pokemon.name.toLocaleLowerCase("pt-BR").includes(term)
      || pokemon.number.toLocaleLowerCase("pt-BR").includes(term)
      || pokemon.set.name.toLocaleLowerCase("pt-BR").includes(term)
      || `${pokemon.number}/${pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal}`.includes(term)
    );
  }, [cardsWithHistory, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400"><ChartNoAxesCombined size={22} /></div>
          <div>
            <h2 className="font-bold">Evolução dos seus preços</h2>
            <p className="text-sm text-muted-foreground">Cada alteração no Valor de Mercado (Manual) vira um ponto da evolução da carta.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">Carregando histórico...</div>
      ) : cardsWithHistory.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold">Nenhuma alteração de preço ainda</h2>
          <p className="mt-2 text-muted-foreground">Quando você salvar ou alterar o Valor na Liga (Mercado), o histórico aparecerá aqui.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-xl border bg-card p-3">
            <p className="px-2 pb-2 text-sm font-semibold text-muted-foreground">Cartas com histórico ({cardsWithHistory.length})</p>
            <div className="relative mb-3 px-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar carta, número ou coleção..."
                className="pl-9"
              />
            </div>
            <div className="max-h-[560px] space-y-1 overflow-y-auto">
              {filteredCards.map(({ collection, pokemon }) => {
                const isSelected = collection.id === selectedCardId;
                const count = entriesByCard.get(collection.id)?.length ?? 0;
                return (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedCardId(collection.id)}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${isSelected ? "bg-blue-500/10" : "hover:bg-muted"}`}
                  >
                    <Image src={pokemon.images.small} alt={pokemon.name} width={60} height={84} className="h-14 w-10 rounded object-contain" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{pokemon.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">#{pokemon.number}/{pokemon.set.printedTotal} · {count} {count === 1 ? "registro" : "registros"}</span>
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                );
              })}
              {filteredCards.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma carta encontrada.</p>
              )}
            </div>
          </section>

          {selectedCard && initialPrice !== undefined && currentPrice !== undefined && (
            <section className="rounded-xl border bg-card p-5">
              <div className="flex items-start gap-4">
                <Image src={selectedCard.pokemon.images.small} alt={selectedCard.pokemon.name} width={100} height={140} className="h-28 w-20 rounded-md object-contain" />
                <div>
                  <h2 className="text-xl font-black">{selectedCard.pokemon.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedCard.pokemon.set.name} · #{selectedCard.pokemon.number}/{selectedCard.pokemon.set.printedTotal}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Metric label="Primeiro valor" value={formatCurrency(initialPrice)} />
                <Metric label="Valor atual" value={formatCurrency(currentPrice)} />
                <Metric
                  label="Valorização"
                  value={`${difference >= 0 ? "+" : ""}${formatCurrency(difference)}`}
                  positive={difference >= 0}
                />
              </div>

              {chronologicalEntries.length > 1 && (
                <div className="mt-6 rounded-lg border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold">Evolução do preço</h3>
                    <span className="text-xs text-muted-foreground">{chronologicalEntries.length} consultas</span>
                  </div>
                  <PriceLineChart entries={chronologicalEntries} />
                </div>
              )}

              <div className="mt-6 border-t pt-4">
                <h3 className="font-bold">Alterações registradas</h3>
                <ol className="mt-4 space-y-3 border-l border-border pl-5">
                  {selectedEntries.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-blue-500" />
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(entry.price)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)} · Valor manual
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PriceLineChart({ entries }: { entries: PriceHistory[] }) {
  const width = 720;
  const height = 180;
  const padding = 16;
  const prices = entries.map((entry) => entry.price);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const spread = maximum - minimum || 1;
  const points = entries.map((entry, index) => ({
    x: padding + (index / Math.max(entries.length - 1, 1)) * (width - padding * 2),
    y: height - padding - ((entry.price - minimum) / spread) * (height - padding * 2),
    entry,
  }));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 min-w-[480px] w-full" role="img" aria-label="Gráfico da evolução do preço">
        <polyline
          points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-blue-500"
        />
        {points.map(({ x, y, entry }) => (
          <circle key={entry.id} cx={x} cy={y} r="4" fill="currentColor" className="text-blue-500">
            <title>{`${formatDate(entry.createdAt)}: ${formatCurrency(entry.price)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(minimum)}</span>
        <span>{formatCurrency(maximum)}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-1 flex items-center gap-1 text-lg font-black ${positive === undefined ? "" : positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
        {positive !== undefined && (positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />)}
        {value}
      </p>
    </div>
  );
}
