"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Layers3, Plus, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCollection } from "@/hooks/useCollection";
import { useCollectionStore } from "@/store/collectionStore";
import { CollectionView } from "@/hooks/useCollection";

type AlbumOrder = "collection" | "pokedex" | "set";

const CARDS_ON_FIRST_SPREAD = 4;
const CARDS_PER_FULL_SPREAD = 8;

function pokedexNumber(item: CollectionView) {
  return item.pokemon.nationalPokedexNumbers?.[0] ?? Number.MAX_SAFE_INTEGER;
}

function pageSlots(cards: CollectionView[]) {
  return Array.from({ length: 4 }, (_, index) => cards[index] ?? null);
}

export default function AlbumPage() {
  const { collectionView, carregandoValores } = useCollection();
  const fetchCards = useCollectionStore((state) => state.fetchCards);
  const isLoading = useCollectionStore((state) => state.isLoading);
  const [order, setOrder] = useState<AlbumOrder>("collection");
  const [currentSpread, setCurrentSpread] = useState(1);
  const [selectedCard, setSelectedCard] = useState<CollectionView | null>(null);
  const [initialLoadPending, setInitialLoadPending] = useState(true);

  useEffect(() => {
    void fetchCards().catch(() => undefined).finally(() => setInitialLoadPending(false));
  }, [fetchCards]);

  const orderedCards = useMemo(() => {
    const cards = [...collectionView];

    if (order === "pokedex") {
      return cards.sort((a, b) => pokedexNumber(a) - pokedexNumber(b) || a.pokemon.name.localeCompare(b.pokemon.name));
    }

    if (order === "set") {
      return cards.sort((a, b) =>
        a.pokemon.set.name.localeCompare(b.pokemon.set.name) ||
        Number(a.pokemon.number) - Number(b.pokemon.number),
      );
    }

    return cards.sort(
      (a, b) => new Date(a.collection.createdAt).getTime() - new Date(b.collection.createdAt).getTime(),
    );
  }, [collectionView, order]);

  const totalSpreads = orderedCards.length <= CARDS_ON_FIRST_SPREAD
    ? 1
    : 1 + Math.ceil((orderedCards.length - CARDS_ON_FIRST_SPREAD) / CARDS_PER_FULL_SPREAD);
  const cardsBeforeSpread = currentSpread === 1
    ? 0
    : CARDS_ON_FIRST_SPREAD + (currentSpread - 2) * CARDS_PER_FULL_SPREAD;
  const cardsOnSpread = currentSpread === 1 ? CARDS_ON_FIRST_SPREAD : CARDS_PER_FULL_SPREAD;
  const visibleCards = orderedCards.slice(cardsBeforeSpread, cardsBeforeSpread + cardsOnSpread);
  const leftSlots = currentSpread === 1 ? pageSlots([]) : pageSlots(visibleCards.slice(0, 4));
  const rightSlots = currentSpread === 1 ? pageSlots(visibleCards) : pageSlots(visibleCards.slice(4, 8));
  const firstCardNumber = orderedCards.length === 0 ? 0 : cardsBeforeSpread + 1;
  const lastCardNumber = Math.min(cardsBeforeSpread + cardsOnSpread, orderedCards.length);
  const loading = initialLoadPending || isLoading || carregandoValores;

  const changeOrder = (nextOrder: AlbumOrder) => {
    setOrder(nextOrder);
    setCurrentSpread(1);
  };

  if (!loading && collectionView.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-3xl border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <BookOpen size={32} />
          </div>
          <h2 className="mt-5 text-2xl font-bold">Seu álbum está esperando</h2>
          <p className="mt-2 text-sm text-muted-foreground">Adicione sua primeira carta para começar a preencher as páginas do fichário.</p>
          <Link href="/collection" className={buttonVariants({ className: "mt-6" })}>
            <Plus size={16} /> Minha coleção
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <BookOpen size={23} />
          </div>
          <div>
            <p className="font-bold">Meu fichário</p>
            <p className="text-xs text-muted-foreground">{orderedCards.length} {orderedCards.length === 1 ? "carta guardada" : "cartas guardadas"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="album-order" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organizar</label>
          <select
            id="album-order"
            value={order}
            onChange={(event) => changeOrder(event.target.value as AlbumOrder)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="collection">Entrada na coleção</option>
            <option value="pokedex">Número da Pokédex</option>
            <option value="set">Expansão e número</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[55vh] items-center justify-center rounded-3xl border bg-card">
          <div className="text-center text-muted-foreground">
            <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Preparando seu álbum...
          </div>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-blue-950/30 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 p-3 shadow-2xl sm:p-6">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_10%,white_0,transparent_24%),radial-gradient(circle_at_80%_90%,#60a5fa_0,transparent_28%)]" />
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 hidden h-full w-8 -translate-x-1/2 bg-gradient-to-r from-black/20 via-black/55 to-black/20 shadow-xl md:block" />
            <div className="relative grid gap-3 md:grid-cols-2 md:gap-8">
              {[leftSlots, rightSlots].map((slots, pageIndex) => (
                currentSpread === 1 && pageIndex === 0 ? (
                  <div key={pageIndex} className="relative hidden min-h-[616px] items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 shadow-inner md:flex">
                    <div className="pointer-events-none absolute inset-5 rounded-xl border border-blue-400/10" />
                    <div className="text-center text-blue-100/25">
                      <BookOpen className="mx-auto mb-3" size={40} strokeWidth={1.25} />
                      <p className="text-lg font-bold tracking-[0.2em]">COLECIONADEX</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.35em]">Meu fichário</p>
                    </div>
                  </div>
                ) : (
                  <div key={pageIndex} className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-100/95 p-3 shadow-inner dark:bg-slate-900/95 sm:gap-5 sm:p-5">
                    {slots.map((item, slotIndex) => (
                    <div
                      key={item?.collection.id ?? `empty-${pageIndex}-${slotIndex}`}
                      className="flex min-h-56 items-center justify-center rounded-xl border border-slate-300/80 bg-slate-200/70 p-2 shadow-inner dark:border-white/10 dark:bg-black/20 sm:min-h-72 sm:p-3"
                    >
                      {item ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCard(item)}
                          className="group relative w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          aria-label={`Abrir detalhes de ${item.pokemon.name}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.pokemon.images.small}
                            alt={item.pokemon.name}
                            loading="lazy"
                            className="mx-auto max-h-64 w-full object-contain drop-shadow-xl transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03] group-hover:drop-shadow-2xl"
                          />
                          <span className="mt-2 block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{item.pokemon.name}</span>
                        </button>
                      ) : (
                        <div className="text-center text-slate-400 dark:text-slate-600">
                          <Sparkles className="mx-auto mb-2 opacity-40" size={24} />
                          <span className="text-[10px] font-semibold uppercase tracking-widest">Espaço livre</span>
                        </div>
                      )}
                    </div>
                    ))}
                  </div>
                )
              ))}
            </div>

            <div className="relative mt-4 flex items-center justify-between text-xs font-medium text-blue-100/80">
              <span>{currentSpread === 1 ? "Capa interna · Página 1" : `Páginas ${currentSpread * 2 - 2}–${currentSpread * 2 - 1}`}</span>
              <span>{firstCardNumber}–{lastCardNumber} de {orderedCards.length}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setCurrentSpread((spread) => Math.max(1, spread - 1))} disabled={currentSpread === 1}>
              <ChevronLeft size={17} /> Anterior
            </Button>
            <span className="min-w-24 text-center text-sm font-semibold">{currentSpread} de {totalSpreads}</span>
            <Button variant="outline" onClick={() => setCurrentSpread((spread) => Math.min(totalSpreads, spread + 1))} disabled={currentSpread === totalSpreads}>
              Próxima <ChevronRight size={17} />
            </Button>
          </div>
        </>
      )}

      <Dialog open={selectedCard !== null} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          {selectedCard && (
            <div className="grid gap-6 sm:grid-cols-[minmax(220px,300px)_1fr] sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedCard.pokemon.images.large} alt={selectedCard.pokemon.name} className="mx-auto max-h-[65vh] w-full object-contain drop-shadow-2xl" />
              <DialogHeader className="text-left">
                <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400"><Layers3 size={20} /></div>
                <DialogTitle className="text-2xl font-bold">{selectedCard.pokemon.name}</DialogTitle>
                <DialogDescription>{selectedCard.pokemon.set.name} · #{selectedCard.pokemon.number}/{selectedCard.pokemon.set.printedTotalLabel ?? selectedCard.pokemon.set.printedTotal}</DialogDescription>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">Condição</dt><dd className="mt-1 font-semibold">{selectedCard.collection.condition}</dd></div>
                  <div className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">Idioma</dt><dd className="mt-1 font-semibold">{selectedCard.collection.language}</dd></div>
                  <div className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">Raridade</dt><dd className="mt-1 font-semibold">{selectedCard.pokemon.rarity ?? "Não informada"}</dd></div>
                  <div className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">Pokédex</dt><dd className="mt-1 font-semibold">{selectedCard.pokemon.nationalPokedexNumbers?.[0] ? `#${String(selectedCard.pokemon.nationalPokedexNumbers[0]).padStart(3, "0")}` : "—"}</dd></div>
                </dl>
                {selectedCard.collection.notes && <p className="mt-4 rounded-lg border p-3 text-sm text-foreground">{selectedCard.collection.notes}</p>}
              </DialogHeader>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
