"use client";

import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { searchCards } from "@/services/pokemonApi";
import { getPokemonCached } from "@/services/pokemonCache";
import { CardSearchResults } from "@/components/collection/CardSearchResults";
import { AddCardDialog } from "@/components/collection/AddCardDialog";
import { useCollection } from "@/hooks/useCollection";
import { CollectionCard as CollectionCardType } from "@/types/collection-card";


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollectionCard } from "@/components/collection/CollectionCard";

export default function CollectionPage() {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const [apiCards, setApiCards] = useState<PokemonCard[]>([]);

  const [loading, setLoading] = useState(false);

  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [editingCard, setEditingCard] =
    useState<CollectionCardType | null>(null);

  const [openAddDialog, setOpenAddDialog] = useState(false);

  const [selectedCollectionCard, setSelectedCollectionCard] = useState<{
    collection: CollectionCardType;
    pokemon: PokemonCard;
  } | null>(null);

  const {
    collectionView,
    removeCard,
  } = useCollection();

  const resetSearch = () => {
    setSearch("");
    setApiCards([]);
  };

  const handleAddCard = (card: PokemonCard) => {
    setEditingCard(null); // <- adicione esta linha

    setSelectedCard(card);

    resetSearch();

    setOpen(false);

    setOpenAddDialog(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Deseja realmente excluir esta carta?")) {
      return;
    }

    removeCard(id);
  };

  const handleEdit = (id: string) => {
    const card = collectionView.find(
      (item) => item.collection.id === id
    );

    if (!card) return;

    setEditingCard(card.collection);
    setSelectedCard(card.pokemon);
    setOpenAddDialog(true);
  };

  useEffect(() => {
    const loadCards = async () => {
      const term = search.trim();

      const isNumber = /^\d+$/.test(term);
      const isFullNumber = /^\d+\/\d+$/.test(term);

      if (
        term.length < 3 &&
        !isNumber &&
        !isFullNumber
      ) {
        setApiCards([]);
        return;
      }

      try {
        setLoading(true);

        console.log("Pesquisando:", term);
        const result = await searchCards(term);
        console.log("Resultado:", term, result.length);

        setApiCards(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(loadCards, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!selectedCard) return;

    console.log("Carta selecionada:", selectedCard);
  }, [selectedCard]);

  const cards = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return [];

    return apiCards.filter((card) => {
      const fullNumber =
        `${card.number}/${card.set.printedTotal}`.toLowerCase();

      return (
        card.name.toLowerCase().includes(term) ||
        card.number.toLowerCase().includes(term) ||
        fullNumber.includes(term) ||
        card.set.name.toLowerCase().includes(term)
      );
    });
  }, [apiCards, search]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Minha Coleção
        </h1>

        <p className="mt-2 text-muted-foreground">
          Gerencie todas as cartas da sua coleção Pokémon.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />

          <Input
            placeholder="Pesquisar cartas..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          <Plus size={18} />
          Adicionar Carta
        </Button>
      </div>

      {collectionView.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold">
            Nenhuma carta cadastrada
          </h2>

          <p className="mt-2 text-muted-foreground">
            Sua coleção aparecerá aqui assim que você adicionar sua primeira carta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {
            collectionView.map(({ collection, pokemon }) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                pokemon={pokemon}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onClick={() =>
                  setSelectedCollectionCard({
                    collection,
                    pokemon,
                  })
                }
              />
            ))
          }
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Carta</DialogTitle>

            <DialogDescription>
              Pesquise uma carta Pokémon para adicionar à sua coleção.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Input
              placeholder="Pesquisar carta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-[450px] overflow-y-auto rounded-lg border">
              <CardSearchResults
                cards={cards}
                loading={loading}
                onAdd={handleAddCard}
              />

            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={openAddDialog}
        onOpenChange={setOpenAddDialog}
      >
        <DialogContent className="max-w-xl">
          <AddCardDialog
            card={selectedCard}
            editingCard={editingCard}
            onSuccess={() => {
              setOpenAddDialog(false);
              setSelectedCard(null);
              setEditingCard(null);
            }}
          />
        </DialogContent>
      </Dialog>
     
    </div>
  );
}