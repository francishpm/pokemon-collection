"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CollectionView } from "@/hooks/useCollection";
import { consultLigaPrices, toLigaPriceRequest } from "@/services/ligaPriceService";
import { updateLigaPriceReferenceInSupabase } from "@/services/collectionService";
import { useCollectionStore } from "@/store/collectionStore";

type BatchMode = "pending" | "problems" | "all";
const BATCH_SIZE = 20;

interface Props {
  collectionView: CollectionView[];
}

export function LigaPriceBatchUpdate({ collectionView }: Props) {
  const [mode, setMode] = useState<BatchMode>("pending");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fetchCards = useCollectionStore((state) => state.fetchCards);

  const selectedCards = useMemo(() => collectionView.filter(({ collection }) => {
    if (mode === "all") return true;
    if (mode === "pending") return !collection.ligaPriceStatus;
    return ["not_found", "error", "needs_confirmation"].includes(collection.ligaPriceStatus ?? "");
  }), [collectionView, mode]);

  const runBatch = async () => {
    if (selectedCards.length === 0) {
      toast.info("Não há cartas nesse grupo para consultar.");
      return;
    }

    setRunning(true);
    setProgress({ done: 0, total: selectedCards.length });
    const summary = { found: 0, notFound: 0, errors: 0 };

    try {
      for (let offset = 0; offset < selectedCards.length; offset += BATCH_SIZE) {
        const chunk = selectedCards.slice(offset, offset + BATCH_SIZE);
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
            if (result.status === "found") summary.found += 1;
            else if (result.status === "not_found") summary.notFound += 1;
            else summary.errors += 1;
          }));
        } catch (error) {
          console.error("Falha ao consultar lote da Liga Pokémon:", error);
          summary.errors += chunk.length;
        }
        setProgress({ done: Math.min(offset + chunk.length, selectedCards.length), total: selectedCards.length });
      }

      await fetchCards();
      toast.success(
        `Consulta concluída: ${summary.found} com preço, ${summary.notFound} sem anúncio e ${summary.errors} com erro.`,
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 gap-2 sm:w-auto">
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
    </div>
  );
}
