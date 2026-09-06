"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCollectionStore } from "@/store/collectionStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Globe, Layers, TrendingDown, TrendingUp } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { PokedexProgressCard } from "@/components/dashboard/PokedexProgressCard";
import { RecentCardsCard } from "@/components/dashboard/RecentCardsCard";
import { fetchPriceHistory } from "@/services/priceHistoryService";
import { PriceHistory } from "@/types/price.history";

type VariationPeriod = 7 | 30 | 90;

export default function DashboardPage() {
  const [userName, setUserName] = useState("Treinador");
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadedAt, setHistoryLoadedAt] = useState<number | null>(null);
  const [variationPeriod, setVariationPeriod] = useState<VariationPeriod>(30);

  const fetchCards = useCollectionStore((state) => state.fetchCards);

  const {
    collectionView,
    totalCards,
    valorMercado,
    carregandoValores, // <-- Adicionamos isso aqui para o aviso funcionar
  } = useCollection();

  useEffect(() => {
    const initData = async () => {
      // 1. Pega o nome do usuário logado (inclusive o nome customizado se houver)
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        const firstName = user.user_metadata.full_name.split(" ")[0];
        setUserName(firstName);
      } else if (user?.email) {
        setUserName(user.email.split("@")[0]);
      }

      // 2. Carrega as cartas da nuvem
      try {
        await fetchCards();
        setHistory(await fetchPriceHistory());
        setHistoryLoadedAt(Date.now());
      } catch (error) {
        console.error("Erro ao carregar coleção:", error);
      } finally {
        setHistoryLoading(false);
      }
    };

    initData();
  }, [fetchCards]);

  const marketVariation = useMemo(() => {
    if (historyLoadedAt === null) return { amount: 0, percentage: 0, comparedCards: 0 };
    const cutoff = historyLoadedAt - variationPeriod * 24 * 60 * 60 * 1000;
    const collectionCardIds = new Set(collectionView.map(({ collection }) => collection.id));
    const grouped = new Map<string, PriceHistory[]>();

    for (const entry of history) {
      const entries = grouped.get(entry.collectionCardId) ?? [];
      entries.push(entry);
      grouped.set(entry.collectionCardId, entries);
    }

    let previousTotal = 0;
    let currentTotal = 0;
    let comparedCards = 0;

    for (const [cardId, allEntries] of grouped) {
      if (!collectionCardIds.has(cardId)) continue;

      const entries = allEntries
        .filter((entry) => entry.source === "manual")
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const current = entries.at(-1);
      const beforePeriod = entries.filter((entry) => new Date(entry.createdAt).getTime() <= cutoff).at(-1);
      const firstInPeriod = entries.find((entry) => new Date(entry.createdAt).getTime() > cutoff);
      const baseline = beforePeriod ?? firstInPeriod;

      if (!baseline || !current || baseline.id === current.id) continue;

      previousTotal += baseline.price;
      currentTotal += current.price;
      comparedCards += 1;
    }

    const amount = currentTotal - previousTotal;
    return {
      amount,
      percentage: previousTotal > 0 ? (amount / previousTotal) * 100 : 0,
      comparedCards,
    };
  }, [collectionView, history, historyLoadedAt, variationPeriod]);

  const cardsWithoutManualValue = useMemo(
    () => collectionView.filter(({ collection }) => !collection.ligaValue || collection.ligaValue <= 0),
    [collectionView],
  );

  return (
    <div className="space-y-6 p-0 sm:space-y-8">
      {/* Saudação com Status de Carregamento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Boa noite, {userName} 👋</h2>
          <p className="text-slate-500 mt-1">Bem-vindo ao seu gerenciador de coleção.</p>
        </div>
        
        {/* Mostra esse aviso apenas enquanto as cartas estão sendo processadas pela API */}
        {carregandoValores && (
          <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800/50 animate-pulse w-fit">
            <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold">Sincronizando do servidor...</span>
          </div>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="min-w-0 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total de Cartas</CardTitle>
            <Layers className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold sm:text-2xl">{totalCards}</div>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Valor estimado da coleção</CardTitle>
            <Globe className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold sm:text-2xl">
              {valorMercado.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Soma dos valores de mercado preenchidos manualmente</p>
            {cardsWithoutManualValue.length === 1 && (
              <Link href="/collection?value=missing" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400">
                Preencher valor de {cardsWithoutManualValue[0].pokemon.name}
                <ArrowRight size={13} />
              </Link>
            )}
            {cardsWithoutManualValue.length > 1 && (
              <Link href="/collection?value=missing" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400">
                Preencher valor de {cardsWithoutManualValue.length} cartas
                <ArrowRight size={13} />
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Variação de mercado</CardTitle>
            <select
              value={variationPeriod}
              onChange={(event) => setVariationPeriod(Number(event.target.value) as VariationPeriod)}
              className="h-7 rounded-md border bg-background px-2 text-xs"
              aria-label="Período da variação de mercado"
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Calculando histórico...</p>
            ) : marketVariation.comparedCards > 0 ? (
              <>
                <div className={`flex items-center gap-1 text-xl font-bold sm:text-2xl ${marketVariation.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {marketVariation.amount >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  {marketVariation.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", signDisplay: "always" })}
                </div>
                <p className={`mt-1 text-xs font-semibold ${marketVariation.percentage >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {marketVariation.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1, signDisplay: "always" })}% no período
                </p>
                <p className="text-xs text-muted-foreground">Baseado em {marketVariation.comparedCards} cartas comparáveis</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-muted-foreground">Sem comparação</p>
                <p className="mt-1 text-xs text-muted-foreground">São necessárias duas atualizações por carta no período</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seção inferior componentizada */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentCardsCard cards={collectionView} />
        </div>

        <div>
          <PokedexProgressCard collectionView={collectionView} />
        </div>
      </div>
    </div>
  );
}
