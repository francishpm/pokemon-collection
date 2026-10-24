"use client";

import { useEffect, useRef, useState } from "react";
import { compareDuplicateArtwork, duplicateArtworkCategory, type DuplicateArtworkCategory } from "@/lib/duplicateArtwork";
import { supabase } from "@/lib/supabase";
import { parseDuplicatePrice } from "@/lib/duplicatePrices";
import { QuantityQueue } from "@/lib/quantityQueue";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CARD_LANGUAGES, duplicateQuantity, duplicateSlotId, duplicateVariant, type CardLanguage } from "@/lib/pikachuLanguages";
import { openDuplicateCardsPrint } from "@/lib/masterSetExport";
import type { MasterSetSlot } from "@/types/master-set";

export function PikachuDuplicates({ slots, quantities, onSave, artwork = false }: {
  artwork?: boolean;
  slots: MasterSetSlot[];
  quantities: Record<string, number>;
  onSave: (slotId: string, cardId: string, variant: string, quantity: number) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | CardLanguage>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | DuplicateArtworkCategory>("all");
  const [order, setOrder] = useState<"category" | "number">("category");
  const title = artwork ? "EX, Full Art, artes alternativas e clássicas repetidas" : "Pikachus repetidos";
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [priceStorageKey, setPriceStorageKey] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session?.user) return;
      const key = `${artwork ? "artwork" : "pikachu"}-duplicate-prices:${data.session.user.id}`;
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
        if (stored && typeof stored === "object" && !Array.isArray(stored)) {
          setPrices(Object.fromEntries(Object.entries(stored).filter(([, value]) => typeof value === "string")));
        }
        setPriceStorageKey(key);
      } catch { toast.error("Não foi possível carregar os preços salvos neste navegador."); }
    });
    return () => { cancelled = true; };
  }, [artwork]);
  function changePrice(id: string, value: string) {
    const next = { ...prices, [id]: value };
    setPrices(next);
    if (priceStorageKey) {
      try { localStorage.setItem(priceStorageKey, JSON.stringify(next)); }
      catch { toast.error("Não foi possível salvar o preço neste navegador."); }
    }
  }
  const [optimistic, setOptimistic] = useState<Record<string, number>>({});
  const queue = useRef(new QuantityQueue());
  const pending = new Set(Object.keys(optimistic));
  const displayedQuantities = { ...quantities, ...optimistic };
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const total = (language: CardLanguage) => slots.reduce((sum, slot) => sum + duplicateQuantity(displayedQuantities, slot, language), 0);
  const visible = slots.filter((slot) => {
    if (artwork && category !== "all" && duplicateArtworkCategory(slot) !== category) return false;
    const term = search.trim().toLowerCase();
    return (!term || slot.number.includes(term) || slot.name.toLowerCase().includes(term))
      && (filter === "all" || duplicateQuantity(displayedQuantities, slot, filter) > 0);
  }).sort((a, b) => artwork
    ? order === "category" ? compareDuplicateArtwork(a, b) : a.number.localeCompare(b.number, "pt-BR", { numeric: true })
    : 0);

  function change(slot: MasterSetSlot, language: CardLanguage, delta: number) {
    const id = duplicateSlotId(slot, language);
    queue.current.change(id, duplicateQuantity(displayedQuantities, slot, language), delta,
      (quantity) => onSave(id, slot.cardId, duplicateVariant(slot, language), quantity),
      (quantity) => setOptimistic((current) => {
        const next = { ...current };
        if (quantity === null) delete next[id];
        else next[id] = quantity;
        return next;
      }),
      () => toast.error("Não foi possível salvar a quantidade de repetidas. Confira o valor e tente novamente."));
  }

  function exportDuplicates() {
    if (filter === "all" || !visible.length || pending.size) return;
    const label = CARD_LANGUAGES[filter];
    try {
      openDuplicateCardsPrint(`${title} · 30 anos — Repetidas em ${label}`, visible, label,
        Object.fromEntries(visible.map((slot) => [slot.id, duplicateQuantity(displayedQuantities, slot, filter)])),
        Object.fromEntries(visible.map((slot) => [slot.id, parseDuplicatePrice(prices[duplicateSlotId(slot, filter)] ?? "")])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar as repetidas.");
    }
  }

  return <div className="space-y-4">
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <h3 className="text-lg font-bold">{title} · 30 anos</h3>
      <p className="text-sm text-muted-foreground">Informe apenas as cópias extras de cada idioma. Exemplo: se tem 3 em Português e guarda 1, marque 2 repetidas. Esse controle é separado da sua coleção.</p>
      <p className="text-sm text-muted-foreground">Preço opcional por unidade, em reais, separado por idioma. Os preços ficam salvos neste navegador e aparecem nas fotos e no PDF do anúncio.</p>
      <div className="flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-lg bg-muted px-3 py-2">Português: {total("pt")} extra(s)</span>
        <span className="rounded-lg bg-muted px-3 py-2">Inglês: {total("en")} extra(s)</span>
      </div>
      <Input aria-label="Buscar repetida por nome ou número" placeholder="Buscar carta por nome ou número..." value={search} onChange={(event) => setSearch(event.target.value)} />
      {artwork && <div className="flex flex-wrap gap-2" aria-label="Filtrar tipo de carta">
        {([["all", "Todas"], ["classic", "Clássicas"], ["sar", "SAR"], ["artwork", "Full Art e artes alternativas"], ["ex", "EX"]] as const).map(([value, label]) => <Button key={value} variant={category === value ? "default" : "outline"} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</Button>)}
      </div>}
      {artwork && <label className="flex flex-wrap items-center gap-2 text-sm">
        Ordenar por
        <select aria-label="Ordenar repetidas" value={order} onChange={(event) => setOrder(event.target.value as "category" | "number")} className="h-9 rounded-md border border-input bg-background px-3">
          <option value="category">Clássicas → SAR → Full Art → EX</option>
          <option value="number">Número da carta</option>
        </select>
      </label>}
      <div className="flex flex-wrap gap-2" aria-label="Filtrar repetidas por idioma">
        <Button variant={filter === "all" ? "default" : "outline"} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todos ({slots.length})</Button>
        <Button variant={filter === "pt" ? "default" : "outline"} aria-pressed={filter === "pt"} onClick={() => setFilter("pt")}>Repetidas em Português</Button>
        <Button variant={filter === "en" ? "default" : "outline"} aria-pressed={filter === "en"} onClick={() => setFilter("en")}>Repetidas em Inglês</Button>
      </div>
      {filter !== "all" ? <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3">
        <p className="flex-1 basis-56 text-sm">{visible.length} carta(s) com repetidas em {CARD_LANGUAGES[filter]}. Exporte em PDF ou fotos JPG com as cartas exibidas, o idioma e as quantidades extras.</p>
        <Button disabled={!visible.length || pending.size > 0} onClick={exportDuplicates}>Exportar PDF / Foto ({visible.length})</Button>
        <p className="basis-full text-xs text-muted-foreground">A exportação segue a busca, o tipo, o idioma e a ordem exibida. Na janela de exportação, escolha Salvar PDF ou Gerar fotos.</p>
      </div> : <p className="text-sm text-muted-foreground">Escolha “Repetidas em Português” ou “Repetidas em Inglês” para exportar PDF ou foto.</p>}
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {visible.map((slot) => <article key={slot.id} className="rounded-xl border bg-card p-3 [content-visibility:auto] [contain-intrinsic-size:480px]">
        {slot.image && !failedImages.has(slot.image) ? <img src={slot.image} alt={`${slot.name} ${slot.number}`} loading="lazy" decoding="async" onError={() => setFailedImages((current) => new Set(current).add(slot.image))} className="aspect-[2.5/3.5] w-full rounded-lg object-contain" /> : <div className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg bg-muted text-sm">Imagem indisponível</div>}
        <h4 className="mt-3 text-center text-sm font-bold">{slot.name} · {slot.number}{slot.cardId.startsWith("30th-c-") ? " · Clássica" : ""}</h4>
        <div className="mt-3 space-y-3 border-t pt-3">
          {(Object.keys(CARD_LANGUAGES) as CardLanguage[]).map((language) => {
            const quantity = duplicateQuantity(displayedQuantities, slot, language);
            const saving = pending.has(duplicateSlotId(slot, language));
            const priceId = duplicateSlotId(slot, language);
            let priceError = "";
            try { parseDuplicatePrice(prices[priceId] ?? ""); }
            catch { priceError = "Use um valor como 12,50."; }
            return <div key={language} className="space-y-1">
              <p className="text-center text-xs text-muted-foreground">{CARD_LANGUAGES[language]} · extras</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon-sm" aria-label={`Diminuir repetidas do ${slot.name} ${slot.number} em ${CARD_LANGUAGES[language]}`} disabled={quantity === 0} onClick={() => void change(slot, language, -1)}><Minus size={14} /></Button>
                <span className="min-w-6 text-center font-bold" aria-live="polite">{quantity}</span>
                <Button variant="outline" size="icon-sm" aria-label={`Adicionar repetida do ${slot.name} ${slot.number} em ${CARD_LANGUAGES[language]}`} onClick={() => void change(slot, language, 1)}><Plus size={14} /></Button>
              </div>
              <label className="block text-xs text-muted-foreground">
                Preço por unidade (R$)
                <Input inputMode="decimal" placeholder="Ex.: 12,50" value={prices[priceId] ?? ""}
                  disabled={!priceStorageKey} aria-label={`Preço unitário do ${slot.name} ${slot.number} em ${CARD_LANGUAGES[language]}`}
                  aria-invalid={!!priceError} onChange={(event) => changePrice(priceId, event.target.value)} />
              </label>
              {priceError && <p className="text-xs text-destructive" role="alert">{priceError}</p>}
              <p className="min-h-4 text-center text-xs text-muted-foreground" role="status">{saving ? "Salvando..." : ""}</p>
            </div>;
          })}
        </div>
      </article>)}
    </div>
    {!visible.length && <p className="rounded-xl border p-8 text-center text-muted-foreground">Nenhuma repetida encontrada com esses filtros. Use “Todos” para cadastrar cópias extras.</p>}
  </div>;
}
