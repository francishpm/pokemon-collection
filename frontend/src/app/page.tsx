"use client";

import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { PokedexProgressCard } from "@/components/dashboard/PokedexProgressCard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getGreeting } from "@/lib/greeting";
import { useCollection } from "@/hooks/useCollection";
import { RecentCardsCard } from "@/components/dashboard/RecentCardsCard";

export default function Home() {
  const {
    collectionView,
    totalCards,
    totalValue,
    pokedexCount,
    totalPokemon,
    pokedexProgress,
  } = useCollection();
  return (
    <main className="flex min-h-screen bg-slate-50">

      <Sidebar />

      <div className="flex-1">

        <Topbar />

        <div className="mx-auto max-w-7xl p-8">

          <h2 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, Francis 👋
          </h2>

          <p className="mt-2 text-gray-600">
            Bem-vindo ao seu gerenciador de coleção.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">

            <StatCard
              icon="🎴"
              title="Cartas"
              value={totalCards.toString()}
            />

            <StatCard
              icon="💰"
              title="Valor da coleção"
              value={totalValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            />

            <PokedexProgressCard
              pokedexCount={pokedexCount}
              totalPokemon={totalPokemon}
              pokedexProgress={pokedexProgress}
            />

          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">

            <div className="lg:col-span-2">
              <RecentCardsCard cards={collectionView} />
            </div>
          
          </div>

        </div>

      </div>

    </main>
  );
}