"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { openMissingCardsPrint } from "@/lib/masterSetExport";
import { CARD_LANGUAGES, hasCardLanguage, languageSlotId, languageVariant, type CardLanguage } from "@/lib/pikachuLanguages";
import type { MasterSetSlot } from "@/types/master-set";

type Filter = "all" | "pt" | "en" | "both" | "missing-pt" | "missing-en";

export function PikachuLanguages({ slots, quantities, onSave }: {
  slots: MasterSetSlot[];
  quantities: Record<string, number>;
  onSave: (slotId: string, cardId: string, variant: string, owned: boolean) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set());
  const locks = useRef(new Set<string>());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const count = (language: CardLanguage) => slots.filter((slot) => hasCardLanguage(quantities, slot, language)).length;
  const both = slots.filter((slot) => hasCardLanguage(quantities, slot, "pt") && hasCardLanguage(quantities, slot, "en")).length;
  const visible = slots.filter((slot) => {
    const term = search.trim().toLowerCase();
    if (term && !slot.number.includes(term) && !slot.name.toLowerCase().includes(term)) return false;
    const pt = hasCardLanguage(quantities, slot, "pt");
    const en = hasCardLanguage(quantities, slot, "en");
    return filter === "all" || (filter === "pt" && pt) || (filter === "en" && en)
      || (filter === "both" && pt && en) || (filter === "missing-pt" && !pt) || (filter === "missing-en" && !en);
  });
  const missingLanguage = filter === "missing-pt" ? "pt" : filter === "missing-en" ? "en" : null;

  function exportMissing() {
    if (!missingLanguage || !visible.length || pending.size) return;
    const label = CARD_LANGUAGES[missingLanguage];
    try {
      openMissingCardsPrint(`Pikachus · 30 anos — Faltam em ${label}`, visible, label);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar a lista.");
    }
  }

  async function toggle(slot: MasterSetSlot, language: CardLanguage, owned: boolean) {
    const id = languageSlotId(slot, language);
    if (locks.current.has(id)) return;
    locks.current.add(id);
    setPending(new Set(locks.current));
    try {
      await onSave(id, slot.cardId, languageVariant(slot, language), owned);
    } catch {
      toast.error("Não foi possível salvar o idioma. Tente novamente.");
    } finally {
      locks.current.delete(id);
      setPending(new Set(locks.current));
    }
  }

  return <div className="space-y-4">
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div><h3 className="font-bold text-lg">Pikachus · 30 anos</h3>
        <p className="text-sm text-muted-foreground">Marque Português, Inglês ou os dois em cada carta. Este controle de idiomas é separado das quantidades do master set.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-lg bg-muted px-3 py-2">Português: {count("pt")}/{slots.length}</span>
        <span className="rounded-lg bg-muted px-3 py-2">Inglês: {count("en")}/{slots.length}</span>
        <span className="rounded-lg bg-muted px-3 py-2">Nos dois idiomas: {both}/{slots.length}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input aria-label="Buscar Pikachu por nome ou número" placeholder="Buscar Pikachu por nome ou número..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Filtrar idiomas dos Pikachus" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="all">Todos ({slots.length})</option><option value="pt">Tenho em Português</option><option value="en">Tenho em Inglês</option><option value="both">Tenho nos dois</option><option value="missing-pt">Faltam em Português</option><option value="missing-en">Faltam em Inglês</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button variant={filter === "missing-pt" ? "default" : "outline"} onClick={() => setFilter("missing-pt")}>Faltam em Português ({slots.length - count("pt")})</Button>
        <Button variant={filter === "missing-en" ? "default" : "outline"} onClick={() => setFilter("missing-en")}>Faltam em Inglês ({slots.length - count("en")})</Button>
      </div>
      {missingLanguage ? <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3">
        <p className="flex-1 basis-56 text-sm">{visible.length} Pikachu(s) faltante(s) em {CARD_LANGUAGES[missingLanguage]}. O PDF inclui as cartas exibidas e respeita a busca.</p>
        <Button disabled={!visible.length || pending.size > 0} onClick={exportMissing}>Exportar PDF em {CARD_LANGUAGES[missingLanguage]} ({visible.length})</Button>
      </div> : <p className="text-sm text-muted-foreground">Escolha um idioma em “Faltam” para gerar o PDF das cartas que procura.</p>}
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {visible.map((slot) => {
        const pt = hasCardLanguage(quantities, slot, "pt");
        const en = hasCardLanguage(quantities, slot, "en");
        return <article key={slot.id} className={`rounded-xl border bg-card p-3 ${pt && en ? "border-emerald-500/60" : ""}`}>
          {slot.image && !failedImages.has(slot.image) ? <img src={slot.image} alt={`Pikachu ${slot.number}`} loading="lazy" onError={() => setFailedImages((current) => new Set(current).add(slot.image))} className="aspect-[2.5/3.5] w-full rounded-lg object-contain" /> : <div className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg bg-muted text-sm">Imagem indisponível</div>}
          <h4 className="mt-3 text-center text-sm font-bold">Pikachu · {slot.number}</h4>
          <p className="mt-1 text-center text-xs text-muted-foreground">{pt && en ? "Tenho nos dois idiomas" : pt ? "Tenho em Português" : en ? "Tenho em Inglês" : "Nenhum idioma marcado"}</p>
          <div className="mt-3 grid gap-2 border-t pt-3">
            {(Object.keys(CARD_LANGUAGES) as CardLanguage[]).map((language) => <label key={language} className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm ${hasCardLanguage(quantities, slot, language) ? "border-emerald-500/60 bg-emerald-500/10" : ""}`}>
              <input type="checkbox" className="size-4 accent-emerald-500" aria-label={`Pikachu ${slot.number} em ${CARD_LANGUAGES[language]}`} checked={hasCardLanguage(quantities, slot, language)} disabled={pending.has(languageSlotId(slot, language))} onChange={(event) => void toggle(slot, language, event.target.checked)} />
              {CARD_LANGUAGES[language]}
              {pending.has(languageSlotId(slot, language)) && <span className="ml-auto text-xs" role="status">Salvando...</span>}
            </label>)}
          </div>
        </article>;
      })}
    </div>
    {!visible.length && <p className="rounded-xl border p-8 text-center text-muted-foreground">Nenhum Pikachu encontrado com esses filtros.</p>}
  </div>;
}
