"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PokemonCard } from "@/types/pokemon-card";
import { searchCards } from "@/services/pokemonApi";
import { CardSearchResults } from "./CardSearchResults";
import { AddCardDialog } from "./AddCardDialog";

interface CardSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardSearchDialog({ open, onOpenChange }: CardSearchDialogProps) {
  const [search, setSearch] = useState("");
  const [apiCards, setApiCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);

  // Limpa o estado quando o modal é fechado
  useEffect(() => {
    if (!open) {
      setSearch("");
      setApiCards([]);
      setSelectedCard(null);
      setLoading(false);
    }
  }, [open]);

  // Efeito de Debounce para a busca na API
  useEffect(() => {
    const loadCards = async () => {
      const term = search.trim();
      const isNumber = /^\d+$/.test(term);
      const isFullNumber = /^\d+\/\d+$/.test(term);

      if (term.length < 3 && !isNumber && !isFullNumber) {
        setApiCards([]);
        return;
      }

      try {
        setLoading(true);
        const result = await searchCards(term);
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

  // Filtra/Ordena o resultado da API baseado no termo
  const cards = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    return apiCards.filter((card) => {
      const fullNumber = `${card.number}/${card.set.printedTotal}`.toLowerCase();
      return (
        card.name.toLowerCase().includes(term) ||
        card.number.toLowerCase().includes(term) ||
        fullNumber.includes(term) ||
        card.set.name.toLowerCase().includes(term)
      );
    });
  }, [apiCards, search]);

  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={selectedCard ? "max-w-xl" : "max-w-2xl"}>
        {!selectedCard ? (
          <>
            <DialogHeader>
              <DialogTitle>Adicionar Carta</DialogTitle>
              <DialogDescription>
                Pesquise uma carta Pokémon para adicionar à sua coleção.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <Input
                  placeholder="Pesquisar carta (Nome, número, edição)..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-[450px] overflow-y-auto rounded-lg border">
                {search.trim().length >= 3 || /^\d+$/.test(search.trim()) ? (
                  <CardSearchResults
                    cards={cards}
                    loading={loading}
                    onAdd={(card) => setSelectedCard(card)}
                  />
                ) : (
                  <div className="p-10 text-center text-muted-foreground">
                    Digite pelo menos 3 caracteres ou o número da carta.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <DialogTitle>Detalhes da Carta</DialogTitle>
                <DialogDescription>
                  Preencha os dados da sua cópia.
                </DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCard(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </DialogHeader>

            <AddCardDialog
              card={selectedCard}
              editingCard={null}
              onSuccess={handleSuccess}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}