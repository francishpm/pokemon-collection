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
import { useCollectionStore } from "@/store/collectionStore"; // <-- Importação adicionada aqui
import { toast } from "sonner";
import { CollectionShareButton } from "@/components/collection/CollectionShareButton";
import { LigaPriceBatchUpdate } from "@/components/collection/LigaPriceBatchUpdate";

type SortOption = "dateAsc" | "dateDesc" | "priceDesc" | "priceAsc";
type CardTypeFilter = "all" | "pokemon" | "trainer";
type LigaStatusFilter = "all" | "found" | "not_found" | "error" | "needs_confirmation" | "pending" | "price_difference";

function isTrainerCard(card: PokemonCard) {
  const labels = [card.supertype, ...card.subtypes]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /trainer|treinador|supporter|item|stadium|tool/.test(labels);
}

// Atualizado para 30 cartas por página (5 linhas de 6)
const ITEMS_PER_PAGE = 30; 

export default function CollectionPage() {
  const [localSearch, setLocalSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOption>("dateAsc");
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>("all");
  const [ligaStatusFilter, setLigaStatusFilter] = useState<LigaStatusFilter>("all");
  const [selectedPriceIds, setSelectedPriceIds] = useState<string[]>([]);
  
  // Estados para Paginação
  const [currentPage, setCurrentPage] = useState(1);
  
  const [editingCard, setEditingCard] = useState<CollectionCardType | null>(null);
  const [selectedCardForEdit, setSelectedCardForEdit] = useState<PokemonCard | null>(null);

  const { collectionView, removeCard } = useCollection();
  
  // --- BUSCA OS DADOS DO BANCO AO ABRIR A TELA ---
  const fetchCards = useCollectionStore((state) => state.fetchCards);
  const pokedexRepresentatives = useCollectionStore((state) => state.pokedexRepresentatives);
  const setPokedexRepresentative = useCollectionStore((state) => state.setPokedexRepresentative);
  useEffect(() => {
    void fetchCards().catch(() => {
      toast.error("Não foi possível carregar sua coleção.");
    });
  }, [fetchCards]);
  // -----------------------------------------------

  const openSearchModal = useUiStore((state) => state.openSearchModal);

  const typeCounts = useMemo(() => {
    const trainers = collectionView.filter(({ pokemon }) => isTrainerCard(pokemon)).length;
    return { trainers, pokemon: collectionView.length - trainers };
  }, [collectionView]);

  const ligaStatusCounts = useMemo(() => ({
    found: collectionView.filter(({ collection }) => collection.ligaPriceStatus === "found").length,
    not_found: collectionView.filter(({ collection }) => collection.ligaPriceStatus === "not_found").length,
    error: collectionView.filter(({ collection }) => collection.ligaPriceStatus === "error").length,
    needs_confirmation: collectionView.filter(({ collection }) => collection.ligaPriceStatus === "needs_confirmation").length,
    pending: collectionView.filter(({ collection }) => !collection.ligaPriceStatus).length,
    price_difference: collectionView.filter(({ collection }) => collection.ligaValue != null && collection.ligaLowestPrice != null && Math.round(collection.ligaValue * 100) !== Math.round(collection.ligaLowestPrice * 100)).length,
  }), [collectionView]);

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

  const handleSetPokedexRepresentative = async (id: string) => {
    const card = collectionView.find((item) => item.collection.id === id);
    const pokedexNumber = card?.pokemon.nationalPokedexNumbers?.[0];
    if (!pokedexNumber) return;

    try {
      await setPokedexRepresentative(pokedexNumber, id);
      toast.success(`${card.pokemon.name} escolhido para representar o nº ${String(pokedexNumber).padStart(3, "0")} na Pokédex.`);
    } catch {
      toast.error("Não foi possível salvar a carta escolhida para a Pokédex.");
    }
  };

  const filteredAndSortedCollection = useMemo(() => {
    let result = collectionView;

    if (typeFilter === "trainer") {
      result = result.filter(({ pokemon }) => isTrainerCard(pokemon));
    } else if (typeFilter === "pokemon") {
      result = result.filter(({ pokemon }) => !isTrainerCard(pokemon));
    }

    if (ligaStatusFilter === "price_difference") {
      result = result.filter(({ collection }) => collection.ligaValue != null && collection.ligaLowestPrice != null && Math.round(collection.ligaValue * 100) !== Math.round(collection.ligaLowestPrice * 100));
    } else if (ligaStatusFilter === "pending") {
      result = result.filter(({ collection }) => !collection.ligaPriceStatus);
    } else if (ligaStatusFilter !== "all") {
      result = result.filter(({ collection }) => collection.ligaPriceStatus === ligaStatusFilter);
    }

    // 3. Filtro por Texto (Nome, número, set)
    const term = localSearch.trim().toLowerCase();
    if (term) {
      result = result.filter(({ pokemon }) => {
        const fullNumber = `${pokemon.number}/${pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal}`.toLowerCase();
        return (
          pokemon.name.toLowerCase().includes(term) ||
          pokemon.number.toLowerCase().includes(term) ||
          fullNumber.includes(term) ||
          pokemon.set.name.toLowerCase().includes(term)
        );
      });
    }

    // 4. Ordenação
    const sortedResult = [...result].sort((a, b) => {
      // Ordenação por preço
      if (sortOrder === "priceDesc" || sortOrder === "priceAsc") {
        const getPrice = (item: typeof a) => {
          return item.collection.ligaValue ?? 0;
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

      return 0;
    });
    return sortedResult;
  }, [collectionView, localSearch, sortOrder, typeFilter, ligaStatusFilter]);

  // Cálculos de Paginação
  const totalPages = Math.ceil(filteredAndSortedCollection.length / ITEMS_PER_PAGE);
  const paginatedCards = filteredAndSortedCollection.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(260px,320px)_1fr] lg:items-center">
        <div className="relative w-full">
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

        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(150px,184px)_minmax(190px,224px)_minmax(200px,232px)]">
          {/* Menu de Ordenação original e novos */}
          <select
            value={typeFilter}
            onChange={(e) => {
              const nextType = e.target.value as CardTypeFilter;
              setTypeFilter(nextType);
              setCurrentPage(1);
            }}
            className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Filtrar por tipo de carta"
          >
            <option value="all">Todos os tipos ({collectionView.length})</option>
            <option value="pokemon">Pokémon ({typeCounts.pokemon})</option>
            <option value="trainer">Treinadores ({typeCounts.trainers})</option>
          </select>

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
            <option value="priceDesc">Maior Valor (Crescente)</option>
            <option value="priceAsc">Menor Valor (Decrescente)</option>
          </select>

          <select
            value={ligaStatusFilter}
            onChange={(e) => {
              setLigaStatusFilter(e.target.value as LigaStatusFilter);
              setCurrentPage(1);
            }}
            className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Filtrar por referência da Liga"
          >
            <option value="all">Todas as referências ({collectionView.length})</option>
            <option value="found">Com preço ({ligaStatusCounts.found})</option>
            <option value="not_found">Sem anúncio compatível ({ligaStatusCounts.not_found})</option>
            <option value="error">Erro na consulta ({ligaStatusCounts.error})</option>
            <option value="needs_confirmation">Precisa conferir ({ligaStatusCounts.needs_confirmation})</option>
            <option value="pending">Ainda não consultada ({ligaStatusCounts.pending})</option>
            <option value="price_difference">Valor manual diferente da Liga ({ligaStatusCounts.price_difference})</option>
          </select>

        </div>

        <div className="flex flex-wrap items-center gap-2 lg:col-start-2">
          <LigaPriceBatchUpdate collectionView={paginatedCards} selectedIds={selectedPriceIds} onSelectedIdsChange={setSelectedPriceIds} />
          <CollectionShareButton />
          <Button className="gap-2" onClick={() => openSearchModal("collection")}>
            <Plus size={18} />
            Adicionar Carta
          </Button>
        </div>
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
                isPokedexRepresentative={pokedexRepresentatives[pokemon.nationalPokedexNumbers?.[0] ?? 0] === collection.id}
                onSetPokedexRepresentative={handleSetPokedexRepresentative}
                isPriceSelected={selectedPriceIds.includes(collection.id)}
                onTogglePriceSelection={(id) => setSelectedPriceIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id])}
                onClick={() => setSelectedPriceIds((current) => current.includes(collection.id) ? current.filter((selectedId) => selectedId !== collection.id) : [...current, collection.id])}
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[410px]">
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
