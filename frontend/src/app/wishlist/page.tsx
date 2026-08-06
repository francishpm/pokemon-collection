"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWishlist } from "@/hooks/useWishlist";

export default function WishlistPage() {
  const { wishlistView, totalEstimado, loading, removeItem } = useWishlist();
  const [localSearch, setLocalSearch] = useState("");

  // Filtra as cartas da Wishlist em tempo real
  const filteredWishlist = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    if (!term) return wishlistView;

    return wishlistView.filter(({ pokemon }) => {
      const fullNumber = `${pokemon.number}/${pokemon.set.printedTotal}`.toLowerCase();
      return (
        pokemon.name.toLowerCase().includes(term) ||
        pokemon.number.toLowerCase().includes(term) ||
        fullNumber.includes(term) ||
        pokemon.set.name.toLowerCase().includes(term)
      );
    });
  }, [wishlistView, localSearch]);

  return (
    <div className="space-y-8">
      {/* Resumo Financeiro da Wishlist adaptado para Dark Mode */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium text-muted-foreground">Custo Total Estimado</h2>
        <p className="mt-1 text-4xl font-black text-indigo-600 dark:text-indigo-400">
          {totalEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {wishlistView.length} {wishlistView.length === 1 ? "carta desejada" : "cartas desejadas"}
        </p>
      </div>

      {/* Barra de Pesquisa Local */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Pesquisar na sua Wishlist..."
          className="pl-10 h-11 bg-card text-foreground border-border"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      {/* Grid da Wishlist */}
      {loading ? (
        <p className="text-center text-muted-foreground mt-10">Carregando seus desejos...</p>
      ) : wishlistView.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold text-foreground">Sua Wishlist está vazia</h2>
          <p className="mt-2 text-muted-foreground">Use o botão &quot;Adicionar carta&quot; no topo para buscar seus desejos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {filteredWishlist.map(({ wishlist, pokemon }) => (
            <div key={wishlist.id} className="group relative rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-all">
              <img src={pokemon.images.small} alt={pokemon.name} className="mx-auto h-64 object-contain transition-transform group-hover:scale-105" />
              
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
