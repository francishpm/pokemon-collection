"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CARD_LANGUAGES, duplicateQuantity, duplicateSlotId, duplicateVariant, type CardLanguage } from "@/lib/pikachuLanguages";
import { openDuplicateCardsPrint } from "@/lib/masterSetExport";
import type { MasterSetSlot } from "@/types/master-set";

export function PikachuDuplicates({ slots, quantities, onSave }: {
  slots: MasterSetSlot[];
  quantities: Record<string, number>;
  onSave: (slotId: string, cardId: string, variant: string, quantity: number) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | CardLanguage>("all");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set());
  const locks = useRef(new Set<string>());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const total = (language: CardLanguage) => slots.reduce((sum, slot) => sum + duplicateQuantity(quantities, slot, language), 0);
  const visible = slots.filter((slot) => {
    const term = search.trim().toLowerCase();
    return (!term || slot.number.includes(term) || slot.name.toLowerCase().includes(term))
      && (filter === "all" || duplicateQuantity(quantities, slot, filter) > 0);
  });

  async function change(slot: MasterSetSlot, language: CardLanguage, delta: number) {
    const id = duplicateSlotId(slot, language);
    if (locks.current.has(id)) return;
    const next = Math.max(0, duplicateQuantity(quantities, slot, language) + delta);
    locks.current.add(id);
    setPending(new Set(locks.current));
    try {
      await onSave(id, slot.cardId, duplicateVariant(slot, language), next);
    } catch {
      toast.error("Não foi possível salvar a quantidade de repetidas. Tente novamente.");
    } finally {
      locks.current.delete(id);
      setPending(new Set(locks.current));
    }
  }

  function exportDuplicates() {
    if (filter === "all" || !visible.length || pending.size) return;
    const label = CARD_LANGUAGES[filter];
    try {
      openDuplicateCardsPrint(`Pikachus · 30 anos — Repetidas em ${label}`, visible, label,
        Object.fromEntries(visible.map((slot) => [slot.id, duplicateQuantity(quantities, slot, filter)])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar as repetidas.");
    }
  }

  return <div className="space-y-4">
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <h3 className="text-lg font-bold">Pikachus repetidos · 30 anos</h3>
      <p className="text-sm text-muted-foreground">Informe apenas as cópias extras de cada idioma. Exemplo: se tem 3 em Português e guarda 1, marque 2 repetidas. Esse controle é separado da sua coleção.</p>
      <div className="flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-lg bg-muted px-3 py-2">Português: {total("pt")} extra(s)</span>
        <span className="rounded-lg bg-muted px-3 py-2">Inglês: {total("en")} extra(s)</span>
      </div>
      <Input aria-label="Buscar Pikachu repetido por nome ou número" placeholder="Buscar Pikachu por nome ou número..." value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="flex flex-wrap gap-2" aria-label="Filtrar repetidas por idioma">
        <Button variant={filter === "all" ? "default" : "outline"} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todos ({slots.length})</Button>
        <Button variant={filter === "pt" ? "default" : "outline"} aria-pressed={filter === "pt"} onClick={() => setFilter("pt")}>Repetidas em Português</Button>
        <Button variant={filter === "en" ? "default" : "outline"} aria-pressed={filter === "en"} onClick={() => setFilter("en")}>Repetidas em Inglês</Button>
      </div>
      {filter !== "all" ? <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3">
        <p className="flex-1 basis-56 text-sm">{visible.length} carta(s) com repetidas em {CARD_LANGUAGES[filter]}. O PDF inclui as cartas exibidas, o idioma e as quantidades extras.</p>
        <Button disabled={!visible.length || pending.size > 0} onClick={exportDuplicates}>Exportar repetidas em {CARD_LANGUAGES[filter]} ({visible.length})</Button>
      </div> : <p className="text-sm text-muted-foreground">Escolha “Repetidas em Português” ou “Repetidas em Inglês” para gerar o PDF.</p>}
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {visible.map((slot) => <article key={slot.id} className="rounded-xl border bg-card p-3">
        {slot.image && !failedImages.has(slot.image) ? <img src={slot.image} alt={`Pikachu ${slot.number}`} loading="lazy" onError={() => setFailedImages((current) => new Set(current).add(slot.image))} className="aspect-[2.5/3.5] w-full rounded-lg object-contain" /> : <div className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg bg-muted text-sm">Imagem indisponível</div>}
        <h4 className="mt-3 text-center text-sm font-bold">Pikachu · {slot.number}</h4>
        <div className="mt-3 space-y-3 border-t pt-3">
          {(Object.keys(CARD_LANGUAGES) as CardLanguage[]).map((language) => {
            const quantity = duplicateQuantity(quantities, slot, language);
            const saving = pending.has(duplicateSlotId(slot, language));
            return <div key={language} className="space-y-1">
              <p className="text-center text-xs text-muted-foreground">{CARD_LANGUAGES[language]} · extras</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon-sm" aria-label={`Diminuir repetidas do Pikachu ${slot.number} em ${CARD_LANGUAGES[language]}`} disabled={saving || quantity === 0} onClick={() => void change(slot, language, -1)}><Minus size={14} /></Button>
                <span className="min-w-6 text-center font-bold" aria-live="polite">{quantity}</span>
                <Button variant="outline" size="icon-sm" aria-label={`Adicionar repetida do Pikachu ${slot.number} em ${CARD_LANGUAGES[language]}`} disabled={saving} onClick={() => void change(slot, language, 1)}><Plus size={14} /></Button>
              </div>
              {saving && <p className="text-center text-xs text-muted-foreground" role="status">Salvando...</p>}
            </div>;
          })}
        </div>
      </article>)}
    </div>
    {!visible.length && <p className="rounded-xl border p-8 text-center text-muted-foreground">Nenhuma repetida encontrada com esses filtros. Use “Todos” para cadastrar cópias extras.</p>}
  </div>;
}
