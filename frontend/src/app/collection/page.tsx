"use client";

import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { useCollection } from "@/hooks/useCollection";
import { CollectionCard } from "@/components/collection/CollectionCard";
import { AddCardDialog } from "@/components/collection/AddCardDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CollectionCard as CollectionCardType } from "@/types/collection-card";
import { PokemonCard } from "@/types/pokemon-card";
import { useUiStore } from "@/store/uiStore";

export default function CollectionPage() {
  const [localSearch, setLocalSearch] = useState("");
  const [editingCard, setEditingCard] = useState<CollectionCardType | null>(null);
  const [selectedCardForEdit, setSelectedCardForEdit] = useState<PokemonCard | null>(null);

  const { collectionView, removeCard } = useCollection();
  
  // Usamos a store para abrir o modal em vez de um estado local
  const openSearchModal = useUiStore((state) => state.openSearchModal);

  const handleDelete = (id: string) => {
    if (!confirm("Deseja realmente excluir esta carta?")) return;
    removeCard(id);
  };

  const handleEdit = (id: string) => {
    const card = collectionView.find((item) => item.collection.id === id);
    if (!card) return;
    setEditingCard(card.collection);
    setSelectedCardForEdit(card.pokemon);
  };

  const filteredCollection = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    if (!term) return collectionView;

    return collectionView.filter(({ pokemon }) => {
      const fullNumber = `${pokemon.number}/${pokemon.set.printedTotal}`.toLowerCase();
      return (
        pokemon.name.toLowerCase().includes(term) ||
        pokemon.number.toLowerCase().includes(term) ||
        fullNumber.includes(term) ||
        pokemon.set.name.toLowerCase().includes(term)
      );
    });
  }, [collectionView, localSearch]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Pesquisar na sua coleção..."
            className="pl-10"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <Button className="gap-2" onClick={openSearchModal}>
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
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {filteredCollection.map(({ collection, pokemon }) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              pokemon={pokemon}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Modal exclusivo para Edição de carta já cadastrada */}
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