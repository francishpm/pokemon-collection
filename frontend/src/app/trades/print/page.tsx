"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TradeStatus, useTrades } from "@/hooks/useTrades";

const CARDS_PER_PAGE = 16;

const statusOf = (status?: TradeStatus): TradeStatus => status ?? "available";

export default function TradePrintPage() {
  const { tradesView, loading, fetchTrades } = useTrades();
  const [settledImageIds, setSettledImageIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void fetchTrades();
  }, [fetchTrades]);

  const activeTrades = useMemo(
    () => tradesView.filter(({ trade }) => statusOf(trade.status) !== "completed"),
    [tradesView],
  );

  const pages = useMemo(
    () => Array.from(
      { length: Math.ceil(activeTrades.length / CARDS_PER_PAGE) },
      (_, index) => activeTrades.slice(index * CARDS_PER_PAGE, (index + 1) * CARDS_PER_PAGE),
    ),
    [activeTrades],
  );

  const settledImages = activeTrades.reduce(
    (count, { trade }) => count + (settledImageIds.has(trade.id) ? 1 : 0),
    0,
  );
  const imagesReady = activeTrades.length === 0 || settledImages === activeTrades.length;

  const markImageAsSettled = (tradeId: string) => {
    setSettledImageIds((current) => {
      if (current.has(tradeId)) return current;
      const next = new Set(current);
      next.add(tradeId);
      return next;
    });
  };

  const goBack = () => {
    if (window.opener) window.close();
    else window.history.back();
  };

  return (
    <div className="trade-pdf-root min-h-screen bg-white text-slate-950">
      <div className="trade-pdf-toolbar sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b bg-white/95 p-4 shadow-sm backdrop-blur">
        <div>
          <h1 className="text-lg font-black">Catálogo de trocas - prévia 4×4</h1>
          <p className="text-xs text-slate-500">
            {loading ? "Carregando cartas..." : `${activeTrades.length} cartas em ${pages.length} página(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goBack}><ArrowLeft /> Voltar</Button>
          <Button disabled={loading || !imagesReady || activeTrades.length === 0} onClick={() => window.print()}>
            {loading || !imagesReady ? <Loader2 className="animate-spin" /> : <FileDown />}
            {loading ? "Carregando" : !imagesReady ? `Imagens ${settledImages}/${activeTrades.length}` : "Salvar como PDF"}
          </Button>
        </div>
      </div>

      {!loading && activeTrades.length === 0 && (
        <div className="mx-auto mt-16 max-w-md rounded-xl border border-dashed p-10 text-center text-slate-500">
          Não há cartas disponíveis ou reservadas para incluir no PDF.
        </div>
      )}

      <div className="trade-pdf-preview mx-auto space-y-6 bg-slate-100 p-6">
        {pages.map((page, pageIndex) => (
          <section key={pageIndex} className="trade-pdf-page mx-auto flex flex-col bg-white p-[8mm] shadow-xl">
            <header className="mb-[3mm] flex h-[10mm] items-center justify-between border-b border-slate-300 pb-[2mm]">
              <div>
                <h2 className="text-[12pt] font-black leading-none">Cartas para troca e venda</h2>
                <p className="mt-1 text-[6.5pt] text-slate-500">Consulte a vitrine online para confirmar disponibilidade e preços.</p>
              </div>
              <span className="text-[7pt] font-semibold text-slate-500">Página {pageIndex + 1} de {pages.length}</span>
            </header>

            <div className="trade-pdf-grid grid min-h-0 flex-1 grid-cols-4 grid-rows-4 gap-[2mm]">
              {page.map(({ trade, pokemon }) => {
                const reserved = statusOf(trade.status) === "reserved";
                return (
                  <article key={trade.id} className={`flex min-h-0 flex-col overflow-hidden rounded-[2mm] border p-[1.5mm] ${reserved ? "border-amber-500 bg-amber-50" : "border-slate-300"}`}>
                    <div className="relative min-h-0 flex-1">
                      {/* A impressão precisa carregar todas as imagens, inclusive as páginas fora da tela. */}
                      <img
                        src={pokemon.images.small}
                        alt={pokemon.name}
                        loading="eager"
                        decoding="async"
                        onLoad={() => markImageAsSettled(trade.id)}
                        onError={() => markImageAsSettled(trade.id)}
                        className="h-full w-full object-contain"
                      />
                      {reserved && <span className="absolute right-0 top-0 rounded bg-amber-500 px-1 py-0.5 text-[5.5pt] font-black uppercase text-white">Reservada</span>}
                    </div>
                    <div className="mt-[1mm] text-center leading-tight">
                      <h3 className="truncate text-[7pt] font-black">{pokemon.name}</h3>
                      <p className="mt-0.5 truncate text-[5.5pt] text-slate-500">#{pokemon.number}/{pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal} · {pokemon.set.name}</p>
                      <p className="mt-0.5 text-[7pt] font-black text-emerald-700">
                        {trade.price != null ? trade.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Apenas troca"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="mt-[2mm] h-[5mm] border-t border-slate-200 pt-[1.5mm] text-center text-[5.5pt] text-slate-400">
              Gerado em {new Date().toLocaleDateString("pt-BR")} · Os dados podem mudar após a geração deste arquivo.
            </footer>
          </section>
        ))}
      </div>

      <style jsx global>{`
        .trade-pdf-page { width: 210mm; height: 297mm; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { background: white !important; }
          body * { visibility: hidden !important; }
          .trade-pdf-root, .trade-pdf-root * { visibility: visible !important; }
          .trade-pdf-root { position: absolute; inset: 0; width: 210mm; }
          .trade-pdf-toolbar { display: none !important; }
          .trade-pdf-preview { margin: 0 !important; padding: 0 !important; background: white !important; }
          .trade-pdf-page { margin: 0 !important; box-shadow: none !important; break-after: page; page-break-after: always; }
          .trade-pdf-page:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
    </div>
  );
}
