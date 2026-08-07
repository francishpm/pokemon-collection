"use client";

import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { CardCondition, CardLanguage, CollectionCard as CollectionCardType } from "@/types/collection-card";
import { useCollectionStore } from "@/store/collectionStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { savePokemonInCache } from "@/services/pokemonCache";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConditionSelector } from "./ConditionSelector";
import { PriceInput } from "./PriceInput";
import { cn } from "@/lib/utils";
import { ExternalLink, Star } from "lucide-react";
import { getLigaPokemonUrl } from "@/lib/ligaPokemon";

interface AddCardDialogProps {
  card: PokemonCard | null;
  editingCard: CollectionCardType | null;
  onSuccess: () => void;
}

interface MarketData {
  cotacaoDolarUsada?: number;
  prices: {
    usd: number;
    brl: number;
    usdText: string;
    brlText: string;
  };
}

export function AddCardDialog({ card, editingCard, onSuccess }: AddCardDialogProps) {
  const [condition, setCondition] = useState<CardCondition>("NM");
  const [language, setLanguage] = useState<CardLanguage>("PT");
  const [acquisitionValue, setAcquisitionValue] = useState("");
  const [ligaValue, setLigaValue] = useState(""); // <-- ESTADO NOVO
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [notes, setNotes] = useState("");

  const [dadosMercado, setDadosMercado] = useState<MarketData | null>(null);
  const [carregandoMercado, setCarregandoMercado] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);

  const { addCard, updateCard } = useCollectionStore();
  const { addItem: addToWishlist } = useWishlistStore();

  useEffect(() => {
    if (!card) return;

    const buscarPrecoMercado = async () => {
      setCarregandoMercado(true);
      try {
        const res = await fetch(`/api/tcg?id=${card.id}`);
        const data: { success?: boolean } & Partial<MarketData> = await res.json();

        if (data.success && data.prices) {
          setDadosMercado({
            cotacaoDolarUsada: data.cotacaoDolarUsada,
            prices: data.prices,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados do mercado:", error);
      } finally {
        setCarregandoMercado(false);
      }
    };

    buscarPrecoMercado();
  }, [card]);

  useEffect(() => {
    const timer = setTimeout(() => {
    if (!editingCard) {
      setCondition("NM");
      setLanguage("PT");
      setAcquisitionValue("");
      setLigaValue(""); // <-- LIMPANDO
      setAcquisitionDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      return;
    }

    setCondition(editingCard.condition);
    setLanguage(editingCard.language);
    setAcquisitionValue(editingCard.acquisitionValue?.toString() ?? "");
    setLigaValue(editingCard.ligaValue?.toString() ?? ""); // <-- CARREGANDO NA EDIÇÃO
    setAcquisitionDate(editingCard.acquisitionDate ?? "");
    setNotes(editingCard.notes ?? "");
    }, 0);

    return () => clearTimeout(timer);
  }, [editingCard]);

  const handleSaveCollection = async () => {
    if (!card) return;

    const baseCardData = {
      condition,
      language,
      acquisitionValue: acquisitionValue ? Number(acquisitionValue) : undefined,
      ligaValue: ligaValue ? Number(ligaValue) : undefined, // <-- SALVANDO NO BANCO
      acquisitionDate: acquisitionDate || undefined,
      notes: notes || undefined,
    };

    setSavingCollection(true);
    try {
      if (editingCard) {
        await updateCard({ ...editingCard, ...baseCardData });
        toast.success("Carta atualizada com sucesso!");
      } else {
        await addCard({
          id: crypto.randomUUID(),
          pokemonCardId: card.id,
          pokemonData: card,
          createdAt: new Date().toISOString(),
          ...baseCardData,
        });
        savePokemonInCache(card);
        toast.success("Carta adicionada à Coleção!");
      }

      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar carta:", error);
      toast.error("Não foi possível salvar a carta. Tente novamente.");
    } finally {
      setSavingCollection(false);
    }
  };

  const handleSaveWishlist = async () => {
    if (!card) return;

    try {
      await addToWishlist({
        id: crypto.randomUUID(),
        pokemonCardId: card.id,
        pokemonData: card,
        createdAt: new Date().toISOString(),
      });
      savePokemonInCache(card);
      toast.success(`${card.name} adicionada à sua Wishlist!`);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar wishlist:", error);
      toast.error("Não foi possível salvar a carta na Wishlist.");
    }
  };

  if (!card) return null;

  const languages: { id: CardLanguage; label: string }[] = [
    { id: "PT", label: "Português" },
    { id: "EN", label: "Inglês" },
    { id: "JP", label: "Japonês" },
  ];

  const temPreco = dadosMercado && dadosMercado.prices.usd > 0;
  const ligaUrl = getLigaPokemonUrl(card.name, card.number, card.set.printedTotal, card.set.ligaEdition);

  return (
    <div className="space-y-6 text-foreground">
      {/* Card de Apresentação da Carta adaptado para Dark Mode */}
      <div className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm items-stretch">
        <img src={card.images.small} alt={card.name} className="h-36 rounded-md object-contain drop-shadow-md" />

        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{card.name}</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {card.set.name} • #{card.number}/{card.set.printedTotal}
            </p>
          </div>

          <div className={cn(
            "mt-3 rounded-lg border p-3 shadow-sm transition-colors",
            temPreco ? "border-emerald-500/30 bg-emerald-950/20" : "border-border bg-background"
          )}>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              temPreco ? "text-emerald-400" : "text-muted-foreground"
            )}>
              Média Global (TCGPlayer)
            </p>

            {carregandoMercado ? (
              <div className="h-7 w-32 animate-pulse rounded bg-muted mt-1" />
            ) : temPreco ? (
              <div className="mt-1 flex flex-col">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{dadosMercado.prices.brlText}</span>
                <span className="text-xs font-semibold text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
                  {dadosMercado.prices.usdText} (Dólar a R$ {dadosMercado.cotacaoDolarUsada?.toFixed(2).replace('.', ',')})
                </span>
              </div>
            ) : (
              <div className="mt-1 flex flex-col">
                <span className="text-lg font-bold text-muted-foreground">Preço indisponível</span>
                <span className="text-xs font-medium text-muted-foreground mt-1">Sem registros recentes globais.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">Condição da Carta</label>
          <ConditionSelector value={condition} onChange={setCondition} />
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-foreground">Valor Pago (Opcional)</label>
            <PriceInput value={acquisitionValue} onChange={setAcquisitionValue} />
          </div>
          <div className="space-y-2">
            {/* NOVO CAMPO: Valor na Liga */}
            <label className="text-sm font-bold text-blue-600 dark:text-blue-400">Valor na Liga (Mercado)</label>
            <PriceInput value={ligaValue} onChange={setLigaValue} />
          </div>
        </div>

        <a
          href={ligaUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400"
        >
          Pesquisar esta carta na Liga Pokémon
          <ExternalLink size={16} />
        </a>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">Data de Aquisição</label>
          <Input
            type="date"
            className="bg-card text-foreground border-border"
            value={acquisitionDate}
            onChange={(e) => setAcquisitionDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex: Comprada no evento, tirada no booster de R$ 14,00..."
            className="flex w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button disabled={savingCollection} onClick={handleSaveCollection} className="flex-1 font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200" size="lg">
          {savingCollection ? "Salvando..." : editingCard ? "Salvar Alterações" : "Adicionar à Coleção"}
        </Button>

        {!editingCard && (
          <Button
            onClick={handleSaveWishlist}
            variant="outline"
            className="font-bold border-border bg-card text-indigo-600 dark:text-indigo-400 hover:bg-accent gap-2"
            size="lg"
          >
            <Star size={18} className="fill-indigo-100 text-indigo-600 dark:fill-indigo-950 dark:text-indigo-400" />
            Wishlist
          </Button>
        )}
      </div>
    </div>
  );
}
