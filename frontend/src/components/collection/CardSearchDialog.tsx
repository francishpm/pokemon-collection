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
import { useUiStore } from "@/store/uiStore";
import { useTrades } from "@/hooks/useTrades";
import { ConditionSelector } from "./ConditionSelector";
import { CardCondition, CardLanguage } from "@/types/collection-card";
import { cn } from "@/lib/utils";

interface CardSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardSearchDialog({ open, onOpenChange }: CardSearchDialogProps) {
  const modalTarget = useUiStore((state) => state.modalTarget);
  const [search, setSearch] = useState("");
  const [apiCards, setApiCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
    if (!open) {
      setSearch("");
      setApiCards([]);
      setSelectedCard(null);
      setLoading(false);
    }
    }, 0);

    return () => clearTimeout(timer);
  }, [open]);

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

  const handleCardClick = (card: PokemonCard) => {
    setSelectedCard(card);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={selectedCard ? "max-w-xl" : "max-w-2xl"}>
        {!selectedCard ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {modalTarget === "trades" ? "Adicionar Carta para Troca" : "Adicionar Carta"}
              </DialogTitle>
              <DialogDescription>
                {modalTarget === "trades"
                  ? "Pesquise uma carta para colocar na sua vitrine de trocas e vendas."
                  : "Pesquise uma carta Pokémon para adicionar à sua coleção."}
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
                    onAdd={(card) => handleCardClick(card)}
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
                <DialogTitle>
                  {modalTarget === "trades" ? "Definir Preço para Troca" : "Detalhes da Carta"}
                </DialogTitle>
                <DialogDescription>
                  {modalTarget === "trades"
                    ? "Informe o valor de venda ou deixe em branco para troca."
                    : "Preencha os dados da sua cópia."}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCard(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </DialogHeader>

            {modalTarget === "trades" ? (
              <TradePriceForm
                card={selectedCard}
                onSuccess={handleSuccess}
              />
            ) : (
              <AddCardDialog
                card={selectedCard}
                editingCard={null}
                onSuccess={handleSuccess}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Sub-componente interno rápido para capturar o preço na hora de adicionar à troca
function TradePriceForm({
  card,
  onSuccess,
}: {
  card: PokemonCard;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<CardCondition>("NM");
  const [language, setLanguage] = useState<CardLanguage>("PT");
  const { addTrade } = useTrades();

  const handleSave = async () => {
    const num = price ? parseFloat(price.replace(",", ".")) : null;
    await addTrade(card, isNaN(num!) ? null : num, condition, language);
    onSuccess();
  };

  const languages: { id: CardLanguage; label: string }[] = [
    { id: "PT", label: "Português" },
    { id: "EN", label: "Inglês" },
    { id: "JP", label: "Japonês" },
  ];

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex gap-4 rounded-xl border border-border bg-card p-4 items-center">
        <img src={card.images.small} alt={card.name} className="h-28 object-contain" />
        <div>
          <h3 className="font-bold text-lg">{card.name}</h3>
          <p className="text-xs text-muted-foreground">
            {card.set.name} • #{card.number}/{card.set.printedTotal}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Condição */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">Condição</label>
          <ConditionSelector value={condition} onChange={setCondition} />
        </div>

        {/* Idioma */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">Idioma</label>
          <div className="flex gap-2">
            {languages.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-all",
                  language === lang.id
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border-border"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preço */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Preço de Venda (Opcional - R$)
          </label>
          <Input
            placeholder="Ex: 50,00 (Deixe vazio para troca)"
            className="bg-card text-foreground border-border"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
        Confirmar e Adicionar às Trocas
      </Button>
    </div>
  );
}
