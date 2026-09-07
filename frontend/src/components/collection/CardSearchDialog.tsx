"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
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
import { toast } from "sonner";
import { getLigaPokemonUrl } from "@/lib/ligaPokemon";
import { consultLigaPrices, LigaPriceResponse, toLigaPriceRequest } from "@/services/ligaPriceService";
import { supabase } from "@/lib/supabase";
import { MASTER_SET_BY_ID } from "@/lib/masterSetConfig";

interface CardSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalizeCardNumber(value: string) {
  const match = value.match(/^([a-z]*)(\d+)([a-z]*)\/([a-z]*)(\d+)$/i);
  if (!match) return value;
  return `${match[1].toLowerCase()}${Number(match[2])}${match[3].toLowerCase()}/${Number(match[5])}`;
}

function parseNameAndNumber(value: string) {
  const match = value.trim().match(/^(.+?)\s+\(?([a-z]*\d+[a-z]*)(?:\/([a-z]*)(\d+))?\)?$/i);
  if (!match) return null;
  return {
    name: match[1].trim().toLowerCase(),
    number: match[2].toLowerCase(),
    printedTotal: match[4],
  };
}

async function searchMasterSetCards(term: string): Promise<PokemonCard[]> {
  const namedCard = parseNameAndNumber(term);
  const name = namedCard?.name ?? (/\d/.test(term) ? "" : term.trim());

  let query = supabase
    .from("master_set_catalog")
    .select("set_id, card_id, card_number, card_name, image_url, rarity, sort_order")
    .order("sort_order", { ascending: true })
    .limit(150);

  if (name) query = query.ilike("card_name", `%${name}%`);
  if (!name && term.trim()) query = query.ilike("card_number", `%${term.trim().replace(/[^a-z0-9]/gi, "")}%`);

  const { data, error } = await query;
  if (error) throw error;

  const uniqueRows = [...new Map((data ?? []).map((row) => [row.card_id, row])).values()];
  return uniqueRows.flatMap((row) => {
    const meta = MASTER_SET_BY_ID.get(row.set_id);
    if (!meta) return [];
    const numberMatches = !namedCard || Number(row.card_number) === Number(namedCard.number);
    if (!numberMatches) return [];
    const isPromo = row.set_id === "mep" || row.set_id === "svp";

    return [{
      id: row.card_id,
      name: row.card_name,
      number: row.card_number,
      images: { small: row.image_url, large: row.image_url },
      rarity: row.rarity ?? undefined,
      supertype: "Pokémon",
      subtypes: [],
      set: {
        id: row.set_id,
        name: meta.name,
        series: meta.seriesId,
        printedTotal: isPromo ? 0 : (meta.printedCards ?? meta.cards),
        printedTotalLabel: isPromo ? "∞" : undefined,
        ligaEdition: isPromo ? row.set_id.toUpperCase() : undefined,
      },
    } satisfies PokemonCard];
  });
}

export function CardSearchDialog({ open, onOpenChange }: CardSearchDialogProps) {
  const modalTarget = useUiStore((state) => state.modalTarget);
  const [search, setSearch] = useState("");
  const [apiCards, setApiCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
    if (!open) {
      setSearch("");
      setApiCards([]);
      setSelectedCard(null);
      setLoading(false);
      setSearchError(null);
    }
    }, 0);

    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const loadCards = async () => {
      const term = search.trim();
      const isNumber = /^[a-z]*\d+[a-z]*$/i.test(term);
      const isFullNumber = /^[a-z]*\d+[a-z]*\/[a-z]*\d+$/i.test(term);

      if (term.length < 3 && !isNumber && !isFullNumber) {
        setApiCards([]);
        setSearchError(null);
        return;
      }

      try {
        setLoading(true);
        setSearchError(null);
        const masterSetSearch = searchMasterSetCards(term);
        void masterSetSearch.then((localCards) => {
          if (!cancelled && localCards.length > 0) setApiCards(localCards);
        }).catch(() => undefined);

        const results = await Promise.allSettled([searchCards(term), masterSetSearch]);
        const cards = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
        if (cards.length === 0 && results.every((result) => result.status === "rejected")) {
          throw new Error("Não foi possível pesquisar os catálogos agora.");
        }
        if (!cancelled) setApiCards([...new Map(cards.map((card) => [card.id, card])).values()]);
      } catch (error) {
        if (cancelled) return;
        setApiCards([]);
        setSearchError(error instanceof Error ? error.message : "Não foi possível pesquisar agora.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timeout = setTimeout(loadCards, 350);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search]);

  const cards = useMemo(() => {
    const term = search.trim().toLowerCase();
    const normalizedTerm = normalizeCardNumber(term);
    const namedCard = parseNameAndNumber(term);
    if (!term) return [];

    return apiCards.filter((card) => {
      const fullNumber = `${card.number}/${card.set.printedTotalLabel ?? card.set.printedTotal}`.toLowerCase();
      if (namedCard) {
        const numberMatches = namedCard.printedTotal
          ? normalizeCardNumber(fullNumber) === normalizeCardNumber(`${namedCard.number}/${namedCard.printedTotal}`)
          : card.number.toLowerCase() === namedCard.number;
        return card.name.toLowerCase().includes(namedCard.name) && numberMatches;
      }
      return (
        card.name.toLowerCase().includes(term) ||
        card.number.toLowerCase().includes(term) ||
        fullNumber.includes(term) ||
        normalizeCardNumber(fullNumber) === normalizedTerm ||
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
      <DialogContent className={selectedCard
        ? "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[410px]"
        : "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-sm"
      }>
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
                    error={searchError}
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
  const [ligaReference, setLigaReference] = useState<LigaPriceResponse | null>(null);
  const [ligaReferenceCriteria, setLigaReferenceCriteria] = useState("");
  const [consultingLiga, setConsultingLiga] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addTrade } = useTrades();

  const handleConsultLiga = async () => {
    setConsultingLiga(true);
    try {
      const [result] = await consultLigaPrices([toLigaPriceRequest(card, language, condition)]);
      setLigaReference(result);
      setLigaReferenceCriteria(`${language}:${condition}`);
      if (result.status === "found" && result.price != null) {
        toast.success(`Referência encontrada: ${result.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
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

  const handleSave = async () => {
    const num = price ? parseFloat(price.replace(",", ".")) : null;
    setSaving(true);
    try {
      await addTrade(card, isNaN(num!) ? null : num, condition, language);
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  const languages: { id: CardLanguage; label: string }[] = [
    { id: "PT", label: "Português" },
    { id: "EN", label: "Inglês" },
    { id: "JP", label: "Japonês" },
  ];

  const ligaUrl = getLigaPokemonUrl(card.name, card.number, card.set.printedTotal, card.set.ligaEdition, card.set.printedTotalLabel, card.set.name);
  const referenceIsCurrent = ligaReferenceCriteria === `${language}:${condition}`;

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex gap-4 rounded-xl border border-border bg-card p-4 items-center">
        <img src={card.images.small} alt={card.name} loading="eager" decoding="async" fetchPriority="high" className="h-28 object-contain" />
        <div>
          <h3 className="font-bold text-lg">{card.name}</h3>
          <p className="text-xs text-muted-foreground">
            {card.set.name} • #{card.number}/{card.set.printedTotalLabel ?? card.set.printedTotal}
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

        <div className="rounded-md border border-sky-500/20 bg-sky-500/5 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-sky-700 dark:text-sky-400">Referência Liga Pokémon</p>
              {!referenceIsCurrent && ligaReference ? (
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
            <Button type="button" variant="outline" size="sm" disabled={consultingLiga} onClick={() => void handleConsultLiga()} className="h-8 shrink-0 gap-1.5 px-2 text-xs">
              <RefreshCw size={14} className={consultingLiga ? "animate-spin" : ""} />
              {consultingLiga ? "Consultando" : "Consultar agora"}
            </Button>
          </div>
        </div>

        <a href={ligaUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/5 px-2.5 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400">
          Pesquisar esta carta na Liga Pokémon
          <ExternalLink size={16} />
        </a>
      </div>

      <Button disabled={saving} onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
        {saving ? "Adicionando..." : "Confirmar e Adicionar às Trocas"}
      </Button>
    </div>
  );
}
