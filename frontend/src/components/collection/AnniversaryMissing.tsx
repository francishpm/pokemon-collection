"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MISSING_CATEGORIES, anniversaryMissingSlots, missingCategory, type MissingCategory } from "@/lib/anniversaryMissing";
import { openMissingCardsPrint, MASTER_SET_VARIANT_LABELS } from "@/lib/masterSetExport";
import type { MasterSetSlot } from "@/types/master-set";

export function AnniversaryMissing({ slots, quantities, progressReady }: {
  slots: MasterSetSlot[];
  quantities: Record<string, number>;
  progressReady: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | MissingCategory>("all");
  const [failedImages, setFailedImages] = useState(new Set<string>());
  const missing = anniversaryMissingSlots(slots, quantities);
  const categories = Object.keys(MISSING_CATEGORIES) as MissingCategory[];
  const visible = categories.flatMap((key) => missing.filter((slot) => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return missingCategory(slot) === key
      && (!term || slot.name.toLocaleLowerCase("pt-BR").includes(term) || slot.number.toLowerCase().includes(term))
      && (category === "all" || key === category);
  }));

  function exportMissing() {
    if (!progressReady || !visible.length) return;
    try {
      openMissingCardsPrint(`Celebração de 30 Anos — ${category === "all" ? "Todas as categorias" : MISSING_CATEGORIES[category]}`, visible);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível exportar as faltantes."); }
  }

  if (!progressReady) return <p role="alert" className="rounded-xl border bg-card p-6">Não foi possível carregar seu progresso. Atualize a página para consultar as faltantes dos dois Master Sets.</p>;

  return <div className="space-y-4">
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <h3 className="text-lg font-bold">Cartas que me faltam · 30 anos</h3>
      <p className="text-sm text-muted-foreground">Esta lista mostra automaticamente as cartas com quantidade zero no Master set de Celebração de 30 Anos e em 30 Anos — Coleção Clássica. Ao atualizar suas quantidades, as faltantes acompanham sua coleção.</p>
      <p className="text-sm text-muted-foreground">O Master set registra as quantidades sem separar por idioma.</p>
      <Link href="/master-sets/30th-c" className="inline-block text-sm font-medium text-blue-500 underline">Atualizar minhas cartas da Coleção Clássica</Link>
      <div className="flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-lg bg-muted px-3 py-2">{missing.length} faltante(s) de {slots.length} cartas</span>
        <span className="rounded-lg bg-muted px-3 py-2">Principais: {missing.filter((slot) => !slot.cardId.startsWith("30th-c-")).length}</span>
        <span className="rounded-lg bg-muted px-3 py-2">Clássicas: {missing.filter((slot) => slot.cardId.startsWith("30th-c-")).length}</span>
      </div>
      <Input aria-label="Buscar carta faltante por nome ou número" placeholder="Buscar carta por nome ou número..." value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="flex flex-wrap gap-2" aria-label="Filtrar categoria das faltantes">
        <Button variant={category === "all" ? "default" : "outline"} aria-pressed={category === "all"} onClick={() => setCategory("all")}>Todas ({missing.length})</Button>
        {categories.map((key) => <Button key={key} variant={category === key ? "default" : "outline"} aria-pressed={category === key} onClick={() => setCategory(key)}>{MISSING_CATEGORIES[key]} ({missing.filter((slot) => missingCategory(slot) === key).length})</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3">
        <p className="flex-1 basis-56 text-sm">{visible.length} carta(s) faltante(s) nos filtros atuais. A exportação inclui as cartas exibidas.</p>
        <Button disabled={!visible.length} onClick={exportMissing}>Exportar PDF / Foto ({visible.length})</Button>
      </div>
    </div>
    {categories.map((key) => {
      const group = visible.filter((slot) => missingCategory(slot) === key);
      if (!group.length) return null;
      return <section key={key} className="space-y-3" aria-label={MISSING_CATEGORIES[key]}>
        <h3 className="text-lg font-bold">{MISSING_CATEGORIES[key]} ({group.length})</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {group.map((slot) => <article key={slot.id} className="rounded-xl border bg-card p-3 [content-visibility:auto] [contain-intrinsic-size:420px]">
            {slot.image && !failedImages.has(slot.image) ? <img src={slot.image} alt={`${slot.name} ${slot.number}`} loading="lazy" decoding="async" onError={() => setFailedImages((current) => new Set(current).add(slot.image))} className="aspect-[2.5/3.5] w-full rounded-lg object-contain" /> : <div className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg bg-muted text-sm">Imagem indisponível</div>}
            <h4 className="mt-3 text-center text-sm font-bold">{slot.name} · {slot.number}</h4>
            <p className="text-center text-xs text-muted-foreground">{MASTER_SET_VARIANT_LABELS[slot.variant]} · Falta na coleção</p>
          </article>)}
        </div>
      </section>;
    })}
    {!visible.length && <p className="rounded-xl border p-8 text-center text-muted-foreground">{missing.length ? "Nenhuma carta faltante encontrada com esses filtros." : "Coleção completa! Você tem todas as cartas dos dois Master Sets."}</p>}
  </div>;
}
