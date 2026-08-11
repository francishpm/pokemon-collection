"use client";

import { useMemo, useState } from "react";
import { CheckSquare, Loader2, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CollectionView } from "@/hooks/useCollection";
import { consultLigaPrices, LigaPriceResponse, toLigaPriceRequest } from "@/services/ligaPriceService";
import { updateLigaPriceReferenceInSupabase, updateCollectionLigaValue } from "@/services/collectionService";
import { useCollectionStore } from "@/store/collectionStore";

type BatchMode = "pending" | "problems" | "all";
const BATCH_SIZE = 5;
const BETWEEN_BATCHES_MS = 1_200;

interface Props {
  collectionView: CollectionView[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

export function LigaPriceBatchUpdate({ collectionView, selectedIds, onSelectedIdsChange }: Props) {
  const [mode, setMode] = useState<BatchMode>("all");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Record<string, LigaPriceResponse>>({});
  const [applying, setApplying] = useState(false);
  const fetchCards = useCollectionStore((state) => state.fetchCards);

  const selectedCards = useMemo(() => collectionView.filter(({ collection }) => {
    if (mode === "all") return true;
    if (mode === "pending") return !collection.ligaPriceStatus;
    return ["not_found", "error", "needs_confirmation"].includes(collection.ligaPriceStatus ?? "");
  }), [collectionView, mode]);

  const selectableIds = selectedCards.map(({ collection }) => collection.id);
  const effectiveSelectedIds = selectedIds.filter((id) => selectableIds.includes(id));
  const selectedResults = effectiveSelectedIds.map((id) => {
    if (results[id]?.status === "found" && results[id].price != null) return results[id];
    const saved = collectionView.find(({ collection }) => collection.id === id)?.collection;
    if (saved?.ligaPriceStatus !== "found" || saved.ligaLowestPrice == null) return undefined;
    return {
      id,
      price: saved.ligaLowestPrice,
      checkedAt: saved.ligaPriceCheckedAt ?? new Date().toISOString(),
      url: saved.ligaPriceUrl ?? "",
      status: "found" as const,
      sourceTrust: saved.ligaPriceSourceTrust,
    };
  }).filter((result): result is LigaPriceResponse => Boolean(result));

  const toggleAll = () => {
    if (effectiveSelectedIds.length === selectableIds.length) {
      onSelectedIdsChange(selectedIds.filter((id) => !selectableIds.includes(id)));
    } else {
      onSelectedIdsChange([...new Set([...selectedIds, ...selectableIds])]);
    }
  };

  const runBatch = async () => {
    const cardsToConsult = selectedCards.filter(({ collection }) => effectiveSelectedIds.includes(collection.id));
    if (cardsToConsult.length === 0) {
      toast.info("Não há cartas nesse grupo para consultar.");
      return;
    }

    setRunning(true);
    setProgress({ done: 0, total: cardsToConsult.length });
    const summary = { found: 0, notFound: 0, errors: 0 };

    try {
      for (let offset = 0; offset < cardsToConsult.length; offset += BATCH_SIZE) {
        const chunk = cardsToConsult.slice(offset, offset + BATCH_SIZE);
        try {
          const results = await consultLigaPrices(chunk.map(({ collection, pokemon }) =>
            toLigaPriceRequest(pokemon, collection.language, collection.condition, collection.id)
          ));

          const resultsById = new Map(results.map((result) => [result.id, result]));
          await Promise.all(chunk.map(async ({ collection }) => {
            const result = resultsById.get(collection.id);
            if (!result) {
              summary.errors += 1;
              return;
            }
            await updateLigaPriceReferenceInSupabase(collection.id, result);
            setResults((current) => ({ ...current, [collection.id]: result }));
            if (result.status === "found") summary.found += 1;
            else if (result.status === "not_found") summary.notFound += 1;
            else summary.errors += 1;
          }));
        } catch (error) {
          console.error("Falha ao consultar lote da Liga Pokémon:", error);
          summary.errors += chunk.length;
        }
        setProgress({ done: Math.min(offset + chunk.length, cardsToConsult.length), total: cardsToConsult.length });
        if (offset + chunk.length < cardsToConsult.length) {
          await new Promise((resolve) => setTimeout(resolve, BETWEEN_BATCHES_MS));
        }
      }

      await fetchCards();
      toast.success(
        `Consulta concluída: ${summary.found} com preço, ${summary.notFound} sem anúncio e ${summary.errors} com erro.`,
      );
    } finally {
      setRunning(false);
    }
  };

  const applySelected = async () => {
    if (!selectedResults.length) return;
    setApplying(true);
    try {
      await Promise.all(selectedResults.map((result) => updateCollectionLigaValue(result.id, result.price!)));
      await fetchCards();
      toast.success(`${selectedResults.length} valor(es) de mercado atualizado(s) e registrado(s) no histórico.`);
      setResults({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar os valores.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
      <select
        value={mode}
        onChange={(event) => setMode(event.target.value as BatchMode)}
        disabled={running}
        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm sm:w-44 sm:flex-none"
        aria-label="Escolher cartas para consultar na Liga Pokémon"
      >
        <option value="pending">Consultar: pendentes ({mode === "pending" ? selectedCards.length : collectionView.filter(({ collection }) => !collection.ligaPriceStatus).length})</option>
        <option value="problems">Consultar: problemas</option>
        <option value="all">Consultar: todas ({collectionView.length})</option>
      </select>
      <Button variant="outline" className="gap-2 whitespace-nowrap" onClick={runBatch} disabled={running}>
        {running ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        {running ? `${progress.done}/${progress.total}` : "Consultar Liga"}
      </Button>
      <Button variant="outline" className="gap-2 whitespace-nowrap" onClick={toggleAll} disabled={running || !selectableIds.length}>
        {effectiveSelectedIds.length === selectableIds.length ? <CheckSquare size={16} /> : <Square size={16} />}
        {effectiveSelectedIds.length === selectableIds.length ? "Desmarcar página" : "Selecionar página"}
      </Button>
      <Button className="gap-2 whitespace-nowrap" onClick={() => void applySelected()} disabled={applying || !selectedResults.length}>
        {applying ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
        {applying ? "Aplicando..." : `Aplicar selecionados (${selectedResults.length})`}
      </Button>
    </div>
  );
}
