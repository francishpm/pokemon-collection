"use client";

import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState, useEffect } from "react";
import { useCollection } from "@/hooks/useCollection";
import { CollectionCard } from "@/components/collection/CollectionCard";
import { AddCardDialog } from "@/components/collection/AddCardDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CollectionCard as CollectionCardType } from "@/types/collection-card";
import { PokemonCard } from "@/types/pokemon-card";
import { useUiStore } from "@/store/uiStore";
import { getGeneration } from "@/lib/getGeneration"; 
import { useCollectionStore } from "@/store/collectionStore"; // <-- Importação adicionada aqui
import { toast } from "sonner";

type SortOption = "dateAsc" | "dateDesc" | "pokedexAsc" | "pokedexDesc" | "priceDesc" | "priceAsc";
type PriceFilterOption = "all" | "has_price" | "no_price";

// Atualizado para 30 cartas por página (5 linhas de 6)
const ITEMS_PER_PAGE = 30; 

export default function CollectionPage() {
  const [localSearch, setLocalSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOption>("dateAsc");
  const [genFilter, setGenFilter] = useState("all"); 
  const [priceFilter, setPriceFilter] = useState<PriceFilterOption>("all");
  
  // Estados para Paginação
  const [currentPage, setCurrentPage] = useState(1);
  
  const [editingCard, setEditingCard] = useState<CollectionCardType | null>(null);
  const [selectedCardForEdit, setSelectedCardForEdit] = useState<PokemonCard | null>(null);

  const { collectionView, removeCard } = useCollection();
  
  // --- BUSCA OS DADOS DO BANCO AO ABRIR A TELA ---
  const fetchCards = useCollectionStore((state) => state.fetchCards);
  useEffect(() => {
    void fetchCards().catch(() => {
      toast.error("Não foi possível carregar sua coleção.");
    });
  }, [fetchCards]);
  // -----------------------------------------------

  const openSearchModal = useUiStore((state) => state.openSearchModal);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta carta?")) return;
    try {
      await removeCard(id);
      toast.success("Carta removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover carta:", error);
      toast.error("Não foi possível remover a carta. Tente novamente.");
    }
  };

  const handleEdit = (id: string) => {
    const card = collectionView.find((item) => item.collection.id === id);
    if (!card) return;
    setEditingCard(card.collection);
    setSelectedCardForEdit(card.pokemon);
  };

  const filteredAndSortedCollection = useMemo(() => {
    let result = collectionView;

    // 1. Filtro de Preço na API
    if (priceFilter !== "all") {
      result = result.filter(({ pokemon }) => {
        let hasPrice = false;
        const prices = pokemon.tcgplayer?.prices;
        if (prices) {
          for (const key in prices) {
            if (prices[key]?.market || prices[key]?.mid || prices[key]?.low) {
              hasPrice = true;
              break;
            }
          }
        }
        
        if (priceFilter === "has_price") return hasPrice;
        if (priceFilter === "no_price") return !hasPrice;
        return true;
      });
    }

    // 2. Filtro por Geração
    if (genFilter !== "all") {
      const targetGen = Number(genFilter);
      result = result.filter(({ pokemon }) => {
        const dexNum = pokemon.nationalPokedexNumbers?.[0];
        if (!dexNum) return false; 
        return getGeneration(dexNum) === targetGen;
      });
    }

    // 3. Filtro por Texto (Nome, número, set)
    const term = localSearch.trim().toLowerCase();
    if (term) {
      result = result.filter(({ pokemon }) => {
        const fullNumber = `${pokemon.number}/${pokemon.set.printedTotal}`.toLowerCase();
        return (
          pokemon.name.toLowerCase().includes(term) ||
          pokemon.number.toLowerCase().includes(term) ||
          fullNumber.includes(term) ||
          pokemon.set.name.toLowerCase().includes(term)
        );
      });
    }

    // 4. Ordenação
    return [...result].sort((a, b) => {
      // Ordenação por preço
      if (sortOrder === "priceDesc" || sortOrder === "priceAsc") {
        const getPrice = (item: typeof a) => {
          if (item.collection.ligaValue && item.collection.ligaValue > 0) return item.collection.ligaValue;
          let usd = 0;
          const prices = item.pokemon.tcgplayer?.prices;
          if (prices) {
            for (const price of Object.values(prices)) {
              if (price.market) {
                usd = price.market;
                break;
              }
              if (!usd) usd = price.mid ?? price.low ?? 0;
            }
          }
          return usd > 0 ? usd * 5.00 : (item.collection.acquisitionValue ?? 0);
        };

        const priceA = getPrice(a);
        const priceB = getPrice(b);
        return sortOrder === "priceDesc" ? priceB - priceA : priceA - priceB;
      }

      if (sortOrder === "dateAsc") {
        return new Date(a.collection.createdAt).getTime() - new Date(b.collection.createdAt).getTime();
      }
      if (sortOrder === "dateDesc") {
        return new Date(b.collection.createdAt).getTime() - new Date(a.collection.createdAt).getTime();
      }

      const dexA = a.pokemon.nationalPokedexNumbers?.[0] ?? 9999;
      const dexB = b.pokemon.nationalPokedexNumbers?.[0] ?? 9999;

      if (sortOrder === "pokedexAsc") {
        return dexA - dexB;
      }
      return dexB - dexA;
    });
  }, [collectionView, localSearch, sortOrder, genFilter, priceFilter]);

  // Cálculos de Paginação
  const totalPages = Math.ceil(filteredAndSortedCollection.length / ITEMS_PER_PAGE);
  const paginatedCards = filteredAndSortedCollection.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Pesquisar na sua coleção..."
            className="pl-10"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Menu de Geração */}
          <select
            value={genFilter}
            onChange={(e) => {
              setGenFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Todas as Gerações</option>
            <option value="1">Gen 1 (Kanto)</option>
            <option value="2">Gen 2 (Johto)</option>
            <option value="3">Gen 3 (Hoenn)</option>
            <option value="4">Gen 4 (Sinnoh)</option>
            <option value="5">Gen 5 (Unova)</option>
            <option value="6">Gen 6 (Kalos)</option>
            <option value="7">Gen 7 (Alola)</option>
            <option value="8">Gen 8 (Galar)</option>
            <option value="9">Gen 9 (Paldea)</option>
          </select>

          {/* Menu de Filtro de Preço */}
          <select
            value={priceFilter}
            onChange={(e) => {
              setPriceFilter(e.target.value as PriceFilterOption);
              setCurrentPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Com e Sem Preço</option>
            <option value="has_price">Somente Com Preço API</option>
            <option value="no_price">Somente Sem Preço API</option>
          </select>

          {/* Menu de Ordenação original e novos */}
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as SortOption);
              setCurrentPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="dateAsc">Mais antigas (Padrão)</option>
            <option value="dateDesc">Mais recentes</option>
            <option value="pokedexAsc">Pokédex (Crescente)</option>
            <option value="pokedexDesc">Pokédex (Decrescente)</option>
            <option value="priceDesc">Maior Valor (Crescente)</option>
            <option value="priceAsc">Menor Valor (Decrescente)</option>
          </select>
        </div>

        <Button className="gap-2" onClick={() => openSearchModal("collection")}>
          <Plus size={18} />
          Adicionar Carta
        </Button>
      </div>

      {collectionView.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold">Nenhuma carta cadastrada</h2>
          <p className="mt-2 text-muted-foreground">
            Sua coleção aparecerá aqui assim que você adicionar sua primeira carta.
          </p>
        </div>
      ) : filteredAndSortedCollection.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold">Nenhuma carta encontrada</h2>
          <p className="mt-2 text-muted-foreground">
            Sua busca ou seus filtros não retornaram nenhum resultado.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {paginatedCards.map(({ collection, pokemon }) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                pokemon={pokemon}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
          
          {/* Controles de Paginação (Inteligente) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="gap-1 hidden sm:flex"
              >
                <ChevronLeft size={16} /> Anterior
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={`w-9 h-9 p-0 ${
                          currentPage === page ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  }

                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-1 text-muted-foreground">
                        ...
                      </span>
                    );
                  }

                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="gap-1 hidden sm:flex"
              >
                Próxima <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal de Edição */}
      <Dialog
        open={!!editingCard}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCard(null);
            setSelectedCardForEdit(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Carta</DialogTitle>
            <DialogDescription>Altere os detalhes da sua carta.</DialogDescription>
          </DialogHeader>
          <AddCardDialog
            card={selectedCardForEdit}
            editingCard={editingCard}
            onSuccess={() => {
              setEditingCard(null);
              setSelectedCardForEdit(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
