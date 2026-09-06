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
import { ExternalLink, RefreshCw, Star } from "lucide-react";
import { getLigaPokemonUrl } from "@/lib/ligaPokemon";
import { consultLigaPrices, LigaPriceResponse, toLigaPriceRequest } from "@/services/ligaPriceService";

interface AddCardDialogProps {
  card: PokemonCard | null;
  editingCard: CollectionCardType | null;
  onSuccess: () => void;
}

export function AddCardDialog({ card, editingCard, onSuccess }: AddCardDialogProps) {
  const [condition, setCondition] = useState<CardCondition>("NM");
  const [language, setLanguage] = useState<CardLanguage>("PT");
  const [acquisitionValue, setAcquisitionValue] = useState("");
  const [ligaValue, setLigaValue] = useState(""); // <-- ESTADO NOVO
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [ligaReference, setLigaReference] = useState<LigaPriceResponse | null>(null);
  const [ligaReferenceCriteria, setLigaReferenceCriteria] = useState("");
  const [consultingLiga, setConsultingLiga] = useState(false);

  const [savingCollection, setSavingCollection] = useState(false);

  const { addCard, updateCard } = useCollectionStore();
  const { addItem: addToWishlist } = useWishlistStore();

  useEffect(() => {
    const timer = setTimeout(() => {
    if (!editingCard) {
      setCondition("NM");
      setLanguage(card?.language ?? "PT");
      setAcquisitionValue("");
      setLigaValue(""); // <-- LIMPANDO
      setAcquisitionDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setLigaReference(null);
      setLigaReferenceCriteria("");
      return;
    }

    setCondition(editingCard.condition);
    setLanguage(editingCard.language);
    setAcquisitionValue(editingCard.acquisitionValue?.toString() ?? "");
    setLigaValue(editingCard.ligaValue?.toString() ?? ""); // <-- CARREGANDO NA EDIÇÃO
    setAcquisitionDate(editingCard.acquisitionDate ?? "");
    setNotes(editingCard.notes ?? "");
    setLigaReference(editingCard.ligaPriceStatus ? {
      id: editingCard.id,
      price: editingCard.ligaLowestPrice,
      checkedAt: editingCard.ligaPriceCheckedAt ?? "",
      url: editingCard.ligaPriceUrl ?? "",
      status: editingCard.ligaPriceStatus,
      sourceTrust: editingCard.ligaPriceSourceTrust,
    } : null);
    setLigaReferenceCriteria(`${editingCard.language}:${editingCard.condition}`);
    }, 0);

    return () => clearTimeout(timer);
  }, [card, editingCard]);

  const handleConsultLiga = async () => {
    if (!card) return;
    setConsultingLiga(true);
    try {
      const [result] = await consultLigaPrices([
        toLigaPriceRequest(card, language, condition, editingCard?.id),
      ]);
      setLigaReference(result);
      setLigaReferenceCriteria(`${language}:${condition}`);
      if (result.status === "found") {
        toast.success(`Referência encontrada: ${result.price?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
      } else if (result.status === "needs_confirmation" && result.reason === "cloudflare_challenge") {
        toast.warning("A Liga solicitou verificação de segurança. Abra a pesquisa abaixo para conferir o preço manualmente.");
      } else if (result.status === "error") {
        toast.error("A Liga está temporariamente indisponível.");
      } else {
        toast.info("Nenhum anúncio compatível foi encontrado na Liga.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível consultar a Liga.");
    } finally {
      setConsultingLiga(false);
    }
  };

  const handleSaveCollection = async () => {
    if (!card) return;

    const referenceIsCurrent = ligaReferenceCriteria === `${language}:${condition}`;
    const baseCardData = {
      condition,
      language,
      acquisitionValue: acquisitionValue ? Number(acquisitionValue) : undefined,
      ligaValue: ligaValue ? Number(ligaValue) : undefined, // <-- SALVANDO NO BANCO
      acquisitionDate: acquisitionDate || undefined,
      notes: notes || undefined,
      ligaLowestPrice: referenceIsCurrent ? ligaReference?.price : undefined,
      ligaPriceCheckedAt: referenceIsCurrent ? ligaReference?.checkedAt : undefined,
      ligaPriceUrl: referenceIsCurrent ? ligaReference?.url : undefined,
      ligaPriceStatus: referenceIsCurrent
        ? ligaReference?.status
        : editingCard ? "needs_confirmation" as const : undefined,
      ligaPriceSourceTrust: referenceIsCurrent ? ligaReference?.sourceTrust : undefined,
    };

    setSavingCollection(true);
    try {
      if (editingCard) {
        await updateCard({ ...editingCard, ...baseCardData });
        toast.success("Carta atualizada com sucesso!");
      } else {
        let cardToSave = card;
        if (!card.nationalPokedexNumbers?.length) {
          try {
            const response = await fetch(`/api/pokemon/species-number?name=${encodeURIComponent(card.name)}`);
            const data = await response.json() as { number?: number | null };
            if (data.number) cardToSave = { ...card, nationalPokedexNumbers: [data.number] };
          } catch {
            // The card can still be saved if the species service is unavailable.
          }
        }
        await addCard({
          id: crypto.randomUUID(),
          pokemonCardId: card.id,
          pokemonData: cardToSave,
          createdAt: new Date().toISOString(),
          ...baseCardData,
        });
        savePokemonInCache(cardToSave);
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

  const ligaUrl = getLigaPokemonUrl(card.name, card.number, card.set.printedTotal, card.set.ligaEdition, card.set.printedTotalLabel, card.set.name);

  return (
    <div className="space-y-3 text-foreground">
      {/* Card de Apresentação da Carta adaptado para Dark Mode */}
      <div className="flex items-stretch justify-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
        <img src={card.images.small} alt={card.name} loading="eager" decoding="async" fetchPriority="high" className="h-36 self-stretch rounded object-contain drop-shadow-md" />

        <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{card.name}</h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {card.set.name} • #{card.number}/{card.set.printedTotalLabel ?? card.set.printedTotal}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="space-y-1">
          <label className="text-xs font-semibold leading-none text-foreground">Condição da Carta</label>
          <ConditionSelector value={condition} onChange={setCondition} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold leading-none text-foreground">Idioma</label>
          <div className="flex gap-2">
            {languages.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                className={cn(
                  "h-8 flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-all",
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold leading-none text-foreground">Valor Pago (Opcional)</label>
            <PriceInput value={acquisitionValue} onChange={setAcquisitionValue} />
          </div>
          <div className="space-y-1">
            {/* NOVO CAMPO: Valor na Liga */}
            <label className="text-xs font-bold text-blue-600 dark:text-blue-400">Valor de Mercado (Manual)</label>
            <PriceInput value={ligaValue} onChange={setLigaValue} />
          </div>
        </div>

        <div className="rounded-md border border-sky-500/20 bg-sky-500/5 px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-sky-700 dark:text-sky-400">Referência Liga Pokémon</p>
              {ligaReferenceCriteria !== `${language}:${condition}` && editingCard ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Idioma ou condição alterados. Consulte novamente.</p>
              ) : ligaReference?.status === "found" && ligaReference.price != null ? (
                <p className="mt-0.5 text-base font-black text-sky-700 dark:text-sky-300">
                  {ligaReference.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  <span className="ml-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    {ligaReference.sourceTrust === "unverified" ? "loja não verificada" : "loja confiável"}
                  </span>
                </p>
              ) : ligaReference?.status === "not_found" ? (
                <p className="mt-1 text-xs text-muted-foreground">Sem anúncio compatível.</p>
              ) : ligaReference?.status === "needs_confirmation" ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">A Liga pediu verificação. Confira pela pesquisa manual abaixo.</p>
              ) : ligaReference?.status === "error" ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Consulta temporariamente indisponível.</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Ainda não consultada.</p>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" disabled={consultingLiga} onClick={() => void handleConsultLiga()} className="h-7 shrink-0 gap-1.5 px-2 text-xs">
              <RefreshCw size={14} className={consultingLiga ? "animate-spin" : ""} />
              {consultingLiga ? "Consultando" : "Consultar agora"}
            </Button>
          </div>
        </div>

        <a
          href={ligaUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/5 px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400"
        >
          Pesquisar esta carta na Liga Pokémon
          <ExternalLink size={16} />
        </a>

        <div className="space-y-1">
          <label className="text-xs font-semibold leading-none text-foreground">Data de Aquisição</label>
          <Input
            type="date"
            className="h-8 bg-card text-foreground border-border"
            value={acquisitionDate}
            onChange={(e) => setAcquisitionDate(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold leading-none text-foreground">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex: Comprada no evento, tirada no booster de R$ 14,00..."
            className="flex w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className={cn(
        "flex gap-3",
        editingCard
          ? "sticky -bottom-4 z-10 -mx-4 border-t border-border bg-popover px-4 pb-1 pt-3"
          : "pt-1",
      )}>
        <Button disabled={savingCollection} onClick={handleSaveCollection} className="h-8 flex-1 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
          {savingCollection ? "Salvando..." : editingCard ? "Salvar Alterações" : "Adicionar à Coleção"}
        </Button>

        {!editingCard && (
          <Button
            onClick={handleSaveWishlist}
            variant="outline"
            className="font-bold border-border bg-card text-indigo-600 dark:text-indigo-400 hover:bg-accent gap-2"
            size="sm"
          >
            <Star size={18} className="fill-indigo-100 text-indigo-600 dark:fill-indigo-950 dark:text-indigo-400" />
            Wishlist
          </Button>
        )}
      </div>
    </div>
  );
}
