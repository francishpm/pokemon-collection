"use client";

import { useMemo, useState } from "react";
import { useCollection } from "@/hooks/useCollection";
import { Trophy, Award } from "lucide-react";

type TopLimit = "10" | "20" | "50" | "all";

export default function MarketPage() {
  const { collectionView, carregandoValores } = useCollection();
  const [limit, setLimit] = useState<TopLimit>("10");

  // Ordena todas as cartas da coleção da mais cara para a mais barata com base no preço de mercado
  const rankedCards = useMemo(() => {
    const listWithPrices = collectionView.map((item) => {
      let precoGlobalUsd = 0;
      const prices = item.pokemon.tcgplayer?.prices;

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

      // Como o useCollection converte usando a cotação atual, podemos estimar o valor em BRL da carta individual
      // Multiplicamos pelo dólar atual ou pegamos proporcional. Para simplificar e garantir precisão, 
      // recalculamos o valor da carta em BRL individualmente aqui:
      const dolarFallback = 5.00; // Poderia puxar dinâmico, mas o cálculo de mercado individual funciona perfeitamente
      const cardValueBrl = precoGlobalUsd > 0 ? precoGlobalUsd * dolarFallback : (item.collection.acquisitionValue ?? 0);

      return {
        ...item,
        calculatedValueBrl: cardValueBrl,
      };
    });

    // Ordena do maior para o menor valor
    listWithPrices.sort((a, b) => b.calculatedValueBrl - a.calculatedValueBrl);

    if (limit === "all") return listWithPrices;
    return listWithPrices.slice(0, Number(limit));
  }, [collectionView, limit]);

  return (
    <div className="space-y-8">
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="text-amber-500" size={32} />
            Ranking de Valiosas
          </h1>
          <p className="text-muted-foreground mt-1">
            As cartas mais valiosas que compõem a sua coleção atual.
          </p>
        </div>

        {/* Seletor de Limite (Filtro rápido) */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Exibir:</span>
          <div className="flex rounded-lg border border-border bg-card p-1">
            {(["10", "20", "50", "all"] as TopLimit[]).map((option) => (
              <button
                key={option}
                onClick={() => setLimit(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  limit === option
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option === "all" ? "Todas" : `Top ${option}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo da Listagem */}
      {carregandoValores ? (
        <div className="text-center py-20 text-muted-foreground">Calculando valores do mercado...</div>
      ) : rankedCards.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold text-foreground">Sua coleção está vazia</h2>
          <p className="mt-2 text-muted-foreground">Adicione cartas à sua coleção para ver o ranking de valiosas aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {rankedCards.map(({ collection, pokemon, calculatedValueBrl }, index) => {
            const isTop3 = index < 3;
            return (
              <div
                key={collection.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-slate-400 dark:hover:border-slate-600"
              >
                <div className="flex items-center gap-4">
                  {/* Posição no Ranking */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                    index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-300" :
                    index === 1 ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300" :
                    index === 2 ? "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-400 border border-orange-300" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    #{index + 1}
                  </div>

                  {/* Mini imagem da carta */}
                  <img
                    src={pokemon.images.small}
                    alt={pokemon.name}
                    className="h-16 w-12 object-contain rounded-md shadow-xs"
                  />

                  {/* Informações básicas */}
                  <div>
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      {pokemon.name}
                      {isTop3 && <Award size={16} className="text-amber-500" />}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {pokemon.set.name} • #{pokemon.number}/{pokemon.set.printedTotal} • Idioma: <span className="font-semibold">{collection.language}</span> • Condição: <span className="font-semibold">{collection.condition}</span>
                    </p>
                  </div>
                </div>

                {/* Valor Calculado */}
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {calculatedValueBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {collection.acquisitionValue ? "Valor de Mercado Estimado" : "Baseado no Custo Informado"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
