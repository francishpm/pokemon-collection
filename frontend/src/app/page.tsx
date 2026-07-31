"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { PokedexProgressCard } from "@/components/dashboard/PokedexProgressCard";
import { getGreeting } from "@/lib/greeting";
import { useCollection } from "@/hooks/useCollection";
import { RecentCardsCard } from "@/components/dashboard/RecentCardsCard";

export default function Home() {
  const {
    collectionView,
    totalCards,
    totalInvestido,
    valorMercado,
    lucroPrejuizo,
    carregandoValores,
    pokedexCount,
    totalPokemon,
    pokedexProgress,
  } = useCollection();

  // Função para formatar moeda
  const formatBRL = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, Francis 👋
        </h2>
        <p className="mt-2 text-gray-600">
          Bem-vindo ao seu gerenciador de coleção.
        </p>
      </div>

      {/* BLOCO FINANCEIRO */}
      <div className="grid gap-6 md:grid-cols-4">
        <StatCard
          icon="🎴"
          title="Total de Cartas"
          value={totalCards.toString()}
        />
        <StatCard
          icon="💰"
          title="Valor Investido (Custo)"
          value={carregandoValores ? "..." : formatBRL(totalInvestido)}
        />
        <StatCard
          icon="🌎"
          title="Média de Mercado Atual"
          value={carregandoValores ? "..." : formatBRL(valorMercado)}
        />
        <StatCard
          icon={lucroPrejuizo >= 0 ? "📈" : "📉"}
          title="Valorização / Lucro"
          value={carregandoValores ? "..." : `${lucroPrejuizo >= 0 ? "+" : ""} ${formatBRL(lucroPrejuizo)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentCardsCard cards={collectionView} />
        </div>
        <div className="lg:col-span-1">
          <PokedexProgressCard
            pokedexCount={pokedexCount}
            totalPokemon={totalPokemon}
            pokedexProgress={pokedexProgress}
          />
        </div>
      </div>
    </div>
  );
}