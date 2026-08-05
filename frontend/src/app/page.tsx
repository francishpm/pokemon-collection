"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCollectionStore } from "@/store/collectionStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, DollarSign, Globe, TrendingUp } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { PokedexProgressCard } from "@/components/dashboard/PokedexProgressCard";
import { RecentCardsCard } from "@/components/dashboard/RecentCardsCard";

export default function DashboardPage() {
  const [userName, setUserName] = useState("Treinador");

  const fetchCards = useCollectionStore((state) => state.fetchCards);

  const {
    collectionView,
    totalCards,
    totalInvestido,
    valorMercado,
    lucroPrejuizo,
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
      await fetchCards();
    };

    initData();
  }, [fetchCards]);

  return (
    <div className="space-y-8 p-6 md:p-8">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total de Cartas</CardTitle>
            <Layers className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Valor Investido (Custo)</CardTitle>
            <DollarSign className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalInvestido.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Média de Mercado Atual</CardTitle>
            <Globe className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {valorMercado.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Valorização / Lucro</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${lucroPrejuizo >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
                }`}
            >
              {lucroPrejuizo.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                signDisplay: "always",
              })}
            </div>
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