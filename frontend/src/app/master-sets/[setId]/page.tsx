"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchMasterSetCatalog, fetchMasterSetProgress, saveMasterSetQuantity } from "@/services/masterSetService";
import { MasterSetCatalog, MasterSetVariant } from "@/types/master-set";
import { openMissingCardsPrint } from "@/lib/masterSetExport";
import { PikachuLanguages } from "@/components/collection/PikachuLanguages";
import { PikachuDuplicates } from "@/components/collection/PikachuDuplicates";
import { isAnniversaryPikachu } from "@/lib/pikachuLanguages";

const VARIANT_LABELS: Record<MasterSetVariant, string> = {
  normal: "Normal",
  reverse: "Reverse Holofoil",
  holo: "Holofoil",
  energy: "Energia",
  pokeball: "Pokébola",
  first_edition: "1ª edição",
};

type StatusFilter = "all" | "owned" | "missing";

export default function MasterSetDetailPage() {
  const { setId } = useParams<{ setId: string }>();
  const [catalog, setCatalog] = useState<MasterSetCatalog | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [variant, setVariant] = useState<"all" | MasterSetVariant>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"collection" | "pikachus" | "duplicates">("collection");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let catalogData: MasterSetCatalog | null = null;
        try {
          catalogData = await fetchMasterSetCatalog(setId);
        } catch (error) {
          console.warn("Catálogo persistente ainda não está disponível:", error);
        }
        if (!catalogData) {
          const catalogResponse = await fetch(`/api/master-sets/sets/${encodeURIComponent(setId)}`);
          const fallbackData = await catalogResponse.json() as MasterSetCatalog & { error?: string };
          if (!catalogResponse.ok) throw new Error(fallbackData.error ?? "Catálogo indisponível.");
          catalogData = fallbackData;
        }
        if (!cancelled) setCatalog(catalogData);

        try {
          const progress = await fetchMasterSetProgress(setId);
          if (!cancelled) setQuantities(Object.fromEntries(progress.map((item) => [item.slotId, item.quantity])));
        } catch (error) {
          console.error("Não foi possível carregar o progresso:", error);
          toast.error("Execute a SQL do Master Set no Supabase para salvar seu progresso.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar o Master Set.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [setId]);

  const pikachuSlots = useMemo(() => (catalog?.slots ?? []).filter(isAnniversaryPikachu), [catalog]);
  const ownedCount = catalog?.slots.filter((slot) => (quantities[slot.id] ?? 0) > 0).length ?? 0;
  const progress = catalog?.slots.length ? (ownedCount / catalog.slots.length) * 100 : 0;
  const availableVariants = useMemo(() => [...new Set(catalog?.slots.map((slot) => slot.variant) ?? [])], [catalog]);
  const filteredSlots = useMemo(() => (catalog?.slots ?? []).filter((slot) => {
    const term = search.trim().toLowerCase();
    const quantity = quantities[slot.id] ?? 0;
    if (term && !slot.name.toLowerCase().includes(term) && !slot.number.toLowerCase().includes(term)) return false;
    if (status === "owned" && quantity === 0) return false;
    if (status === "missing" && quantity > 0) return false;
    return variant === "all" || slot.variant === variant;
  }), [catalog, quantities, search, status, variant]);

  // Export only missing cards in the current filters, including when a selected card becomes owned.
  const visibleMissing = filteredSlots.filter((slot) => (quantities[slot.id] ?? 0) === 0);
  const selectedMissing = visibleMissing.filter((slot) => selected.has(slot.id));
  const exportSlots = selectedMissing.length ? selectedMissing : visibleMissing;
  const exportMissing = () => {
    if (!catalog || !exportSlots.length) return;
    try {
      openMissingCardsPrint(catalog.name, exportSlots);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar a lista.");
    }
  };

  const changeQuantity = async (slotId: string, cardId: string, slotVariant: MasterSetVariant, change: number) => {
    const previous = quantities[slotId] ?? 0;
    const next = Math.max(0, previous + change);
    setQuantities((current) => ({ ...current, [slotId]: next }));
    try {
      await saveMasterSetQuantity(setId, cardId, slotVariant, next);
    } catch {
      setQuantities((current) => ({ ...current, [slotId]: previous }));
      toast.error("Não foi possível salvar essa quantidade.");
    }
  };

  const saveLanguage = async (slotId: string, cardId: string, variant: string, owned: boolean) => {
    // Failed saves leave the previous checkbox value intact.
    await saveMasterSetQuantity(setId, cardId, variant, owned ? 1 : 0);
    setQuantities((current) => ({ ...current, [slotId]: owned ? 1 : 0 }));
  };

  const saveDuplicates = async (slotId: string, cardId: string, variant: string, quantity: number) => {
    await saveMasterSetQuantity(setId, cardId, variant, quantity);
    setQuantities((current) => ({ ...current, [slotId]: quantity }));
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground"><Loader2 className="animate-spin" /> Preparando cartas e variantes...</div>;
  if (!catalog) return <div className="rounded-xl border bg-card p-10 text-center">Coleção indisponível.</div>;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
        <Link href="/master-sets" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Coleções</Link>
        {catalog.logo && <img src={catalog.logo} alt={catalog.name} className="h-16 w-32 shrink-0 object-contain" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">{catalog.name}</h2>
          <p className="text-sm text-muted-foreground">{ownedCount} de {catalog.slots.length} versões · {progress.toFixed(1)}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      {(tab === "collection" || setId !== "30th") && <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar carta ou número..." className="pl-9" /></div>
        <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Todas ({catalog.slots.length})</option><option value="owned">Já tenho ({ownedCount})</option><option value="missing">Faltam ({catalog.slots.length - ownedCount})</option>
        </select>
        <select value={variant} onChange={(event) => setVariant(event.target.value as "all" | MasterSetVariant)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Todas as variantes</option>{availableVariants.map((item) => <option key={item} value={item}>{VARIANT_LABELS[item]}</option>)}
        </select>
      </div>}
      </div>

      {setId === "30th" && <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-2" aria-label="Visualização da coleção">
        <Button variant={tab === "collection" ? "default" : "ghost"} aria-pressed={tab === "collection"} onClick={() => setTab("collection")}>Master set</Button>
        <Button variant={tab === "pikachus" ? "default" : "ghost"} aria-pressed={tab === "pikachus"} onClick={() => setTab("pikachus")}>Pikachus ({pikachuSlots.length})</Button>
        <Button variant={tab === "duplicates" ? "default" : "ghost"} aria-pressed={tab === "duplicates"} onClick={() => setTab("duplicates")}>Pikachus repetidos</Button>
      </div>}

      {tab === "duplicates" && setId === "30th" ? <PikachuDuplicates slots={pikachuSlots} quantities={quantities} onSave={saveDuplicates} /> : tab === "pikachus" && setId === "30th" ? <PikachuLanguages slots={pikachuSlots} quantities={quantities} onSave={saveLanguage} /> : <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <div className="min-w-0 flex-1 basis-64">
          <h3 className="font-bold">Compartilhar faltantes</h3>
          <p className="text-sm text-muted-foreground">{selectedMissing.length ? `${selectedMissing.length} selecionada(s) nos filtros atuais` : `${visibleMissing.length} faltante(s) nos filtros atuais`}. Selecione cartas abaixo ou exporte todas as faltantes exibidas.</p>
        </div>
        <Button variant="outline" disabled={!visibleMissing.length} onClick={() => setSelected(new Set(visibleMissing.map((slot) => slot.id)))}>Selecionar exibidas</Button>
        {selected.size > 0 && <Button variant="ghost" onClick={() => setSelected(new Set())}>Limpar seleção</Button>}
        <Button disabled={!exportSlots.length} onClick={exportMissing}>Exportar PDF ({exportSlots.length})</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {filteredSlots.map((slot) => {
          const quantity = quantities[slot.id] ?? 0;
          return (
            <article key={slot.id} className={`relative overflow-hidden rounded-xl border bg-card p-3 transition [content-visibility:auto] [contain-intrinsic-size:420px] ${quantity > 0 ? "border-emerald-500/60" : ""}`}>
              {quantity === 0 && <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-blue-500" checked={selected.has(slot.id)} aria-label={`Selecionar ${slot.name}, ${slot.number}, ${VARIANT_LABELS[slot.variant]}`} onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((current) => { const next = new Set(current); if (checked) next.add(slot.id); else next.delete(slot.id); return next; });
                }} /> Selecionar para postar
              </label>}
              {quantity > 0 && <span className="absolute right-2 top-2 z-10 rounded-full bg-emerald-500 p-1 text-white"><Check size={13} /></span>}
              <div className={`relative ${slot.variant === "energy" ? "after:absolute after:inset-0 after:bg-gradient-to-br after:from-yellow-400/5 after:via-transparent after:to-cyan-400/20" : slot.variant === "pokeball" ? "after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_center,transparent_35%,rgba(59,130,246,.15)_36%,transparent_38%)]" : ""}`}>
                {slot.image && !failedImages.has(slot.image) ? <img src={slot.image} alt={slot.name} loading="lazy" decoding="async" onError={() => setFailedImages((current) => new Set(current).add(slot.image))} className="mx-auto aspect-[2.5/3.5] w-full rounded-lg object-contain" /> : <div className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">Imagem indisponível</div>}
              </div>
              <h3 className="mt-3 truncate text-center text-sm font-bold">{slot.name}</h3>
              <p className="mt-1 text-center text-xs text-muted-foreground">{slot.number} · {VARIANT_LABELS[slot.variant]}</p>
              <div className="mt-3 flex items-center justify-center gap-3 border-t pt-3">
                <Button variant="outline" size="icon-sm" disabled={quantity === 0} onClick={() => void changeQuantity(slot.id, slot.cardId, slot.variant, -1)}><Minus size={14} /></Button>
                <span className="w-5 text-center font-black">{quantity}</span>
                <Button variant="outline" size="icon-sm" onClick={() => void changeQuantity(slot.id, slot.cardId, slot.variant, 1)}><Plus size={14} /></Button>
              </div>
            </article>
          );
        })}
      </div>
      {filteredSlots.length === 0 && <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Nenhuma carta encontrada com esses filtros.</div>}
      </>}
    </div>
  );
}
