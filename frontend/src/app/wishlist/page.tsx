"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWishlist } from "@/hooks/useWishlist";
import { getGeneration } from "@/lib/getGeneration";
import { comparePokedexNumbers } from "@/lib/pokedexOrdering";

const GENERATIONS = [
  { id: 1, region: "Kanto" },
  { id: 2, region: "Johto" },
  { id: 3, region: "Hoenn" },
  { id: 4, region: "Sinnoh" },
  { id: 5, region: "Unova" },
  { id: 6, region: "Kalos" },
  { id: 7, region: "Alola" },
  { id: 8, region: "Galar" },
  { id: 9, region: "Paldea" },
] as const;

export default function WishlistPage() {
  const { wishlistView, loading, removeItem } = useWishlist();
  const [localSearch, setLocalSearch] = useState("");
  const [generation, setGeneration] = useState("all");

  // Filtra as cartas da Wishlist em tempo real
  const filteredWishlist = useMemo(() => {
    const term = localSearch.trim().toLowerCase();

    return wishlistView
      .filter(({ pokemon }) => {
        const pokedexNumber = pokemon.nationalPokedexNumbers?.[0];
        if (generation !== "all" && (!pokedexNumber || getGeneration(pokedexNumber) !== Number(generation))) {
          return false;
        }

        const fullNumber = `${pokemon.number}/${pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal}`.toLowerCase();
        return !term || (
          pokemon.name.toLowerCase().includes(term) ||
          pokemon.number.toLowerCase().includes(term) ||
          fullNumber.includes(term) ||
          pokemon.set.name.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => comparePokedexNumbers(
        a.pokemon.nationalPokedexNumbers,
        b.pokemon.nationalPokedexNumbers,
      ));
  }, [wishlistView, localSearch, generation]);

  return (
    <div className="space-y-8">
      {/* Resumo da Wishlist */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium text-muted-foreground">Cartas desejadas</h2>
        <p className="mt-1 text-4xl font-black text-indigo-600 dark:text-indigo-400">
          {wishlistView.length}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {wishlistView.length} {wishlistView.length === 1 ? "carta desejada" : "cartas desejadas"}
        </p>
      </div>

      {/* Barra de Pesquisa Local */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Pesquisar na sua Wishlist..."
            className="h-11 border-border bg-card pl-10 text-foreground"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <select
          value={generation}
          onChange={(event) => setGeneration(event.target.value)}
          className="h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground sm:min-w-52"
          aria-label="Filtrar Wishlist por geração"
        >
          <option value="all">Todas as gerações</option>
          {GENERATIONS.map(({ id, region }) => (
            <option key={id} value={id}>Gen {id} — {region}</option>
          ))}
        </select>
      </div>

      {/* Grid da Wishlist */}
      {loading ? (
        <p className="text-center text-muted-foreground mt-10">Carregando seus desejos...</p>
      ) : wishlistView.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold text-foreground">Sua Wishlist está vazia</h2>
          <p className="mt-2 text-muted-foreground">Use o botão &quot;Adicionar carta&quot; no topo para buscar seus desejos.</p>
        </div>
      ) : filteredWishlist.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">Nenhuma carta encontrada</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tente outra geração ou altere o texto pesquisado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {filteredWishlist.map(({ wishlist, pokemon }) => (
            <div key={wishlist.id} className="group relative rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-all">
              <Image unoptimized src={pokemon.images.small} alt={pokemon.name} width={245} height={342} className="mx-auto h-64 object-contain transition-transform group-hover:scale-105" />
              
              <div className="mt-3 text-center">
                <h3 className="line-clamp-1 font-bold text-sm text-foreground">{pokemon.name}</h3>
                <p className="text-xs text-muted-foreground">#{pokemon.number}/${pokemon.set.printedTotal}</p>
              </div>

              <button
                onClick={() => removeItem(wishlist.id)}
                className="absolute right-2 top-2 rounded-full bg-red-500/90 p-2 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 backdrop-blur-sm"
                title="Remover da Wishlist"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
