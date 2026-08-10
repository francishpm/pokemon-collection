"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCollection, type CollectionView } from "@/hooks/useCollection";
import { getGeneration } from "@/lib/getGeneration";
import { useCollectionStore } from "@/store/collectionStore";

type StatusFilter = "all" | "owned" | "missing";

const TOTAL_POKEMON = 1025;
const GENERATIONS = [
  { id: 1, region: "Kanto", total: 151 },
  { id: 2, region: "Johto", total: 100 },
  { id: 3, region: "Hoenn", total: 135 },
  { id: 4, region: "Sinnoh", total: 107 },
  { id: 5, region: "Unova", total: 156 },
  { id: 6, region: "Kalos", total: 72 },
  { id: 7, region: "Alola", total: 88 },
  { id: 8, region: "Galar", total: 96 },
  { id: 9, region: "Paldea", total: 120 },
] as const;

function formatDexNumber(number: number) {
  return `#${String(number).padStart(3, "0")}`;
}

export default function PokedexPage() {
  const [search, setSearch] = useState("");
  const [generation, setGeneration] = useState("1");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const { collectionView } = useCollection();
  const fetchCards = useCollectionStore((state) => state.fetchCards);
  const representatives = useCollectionStore((state) => state.pokedexRepresentatives);
  const setRepresentative = useCollectionStore((state) => state.setPokedexRepresentative);

  useEffect(() => {
    void fetchCards().catch(() => toast.error("Não foi possível carregar sua Pokédex."));
  }, [fetchCards]);

  const cardsByPokedexNumber = useMemo(() => {
    const grouped = new Map<number, CollectionView[]>();
    for (const item of collectionView) {
      const number = item.pokemon.nationalPokedexNumbers?.[0];
      if (!number) continue;
      grouped.set(number, [...(grouped.get(number) ?? []), item]);
    }
    return grouped;
  }, [collectionView]);

  const ownedCount = cardsByPokedexNumber.size;
  const selectedGeneration = generation === "all" ? null : Number(generation);
  const generationOwnedCount = selectedGeneration
    ? [...cardsByPokedexNumber.keys()].filter((number) => getGeneration(number) === selectedGeneration).length
    : ownedCount;
  const generationTotal = selectedGeneration
    ? GENERATIONS.find(({ id }) => id === selectedGeneration)?.total ?? TOTAL_POKEMON
    : TOTAL_POKEMON;
  const progress = generationTotal ? Math.round((generationOwnedCount / generationTotal) * 1000) / 10 : 0;

  const entries = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return Array.from({ length: TOTAL_POKEMON }, (_, index) => index + 1).filter((number) => {
      if (selectedGeneration && getGeneration(number) !== selectedGeneration) return false;
      const cards = cardsByPokedexNumber.get(number);
      if (status === "owned" && !cards) return false;
      if (status === "missing" && cards) return false;
      if (!term) return true;

      return String(number).includes(term) || cards?.some(({ pokemon }) => pokemon.name.toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [cardsByPokedexNumber, search, selectedGeneration, status]);

  const selectedCards = selectedNumber ? cardsByPokedexNumber.get(selectedNumber) ?? [] : [];

  const chooseRepresentative = async (number: number, cardId: string, pokemonName: string) => {
    try {
      await setRepresentative(number, cardId);
      toast.success(`${pokemonName} agora representa o ${formatDexNumber(number)} na Pokédex.`);
    } catch {
      toast.error("Não foi possível salvar essa escolha.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-600/15 via-card to-emerald-500/10 p-5 md:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-500">
              <Sparkles size={16} /> Pokédex Nacional
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Cada espécie aparece uma única vez. Escolha a sua arte favorita quando possuir mais de uma carta do mesmo Pokémon.
            </p>
          </div>
          <div className="min-w-56 rounded-xl border bg-background/70 p-4 backdrop-blur">
            <div className="flex items-end justify-between gap-4">
              <span className="text-3xl font-bold">{ownedCount}</span>
              <span className="pb-1 text-sm text-muted-foreground">de {TOTAL_POKEMON} espécies</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(ownedCount / TOTAL_POKEMON) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Progresso exibido</p>
          <p className="mt-1 text-2xl font-bold">{progress}%</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Encontrados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-500">{generationOwnedCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Faltando</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">{generationTotal - generationOwnedCount}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou número..."
            className="pl-9"
          />
        </div>
        <select
          value={generation}
          onChange={(event) => setGeneration(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filtrar geração"
        >
          <option value="all">Pokédex Nacional</option>
          {GENERATIONS.map(({ id, region }) => <option key={id} value={id}>Gen {id} — {region}</option>)}
        </select>
        <div className="flex rounded-lg border bg-background p-1" aria-label="Filtrar situação da Pokédex">
          {([
            ["all", "Todos"],
            ["owned", "Obtidos"],
            ["missing", "Faltantes"],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={status === value ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatus(value)}
              className="flex-1"
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Nenhuma espécie encontrada com estes filtros.</div>
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {entries.map((number) => {
            const cards = cardsByPokedexNumber.get(number) ?? [];
            const representativeId = representatives[number];
            const representative = cards.find(({ collection }) => collection.id === representativeId) ?? cards[0];
            const isOwned = Boolean(representative);

            return (
              <button
                key={number}
                type="button"
                disabled={!isOwned}
                onClick={() => setSelectedNumber(number)}
                className={`group relative min-h-52 overflow-hidden rounded-xl border p-3 text-left transition ${
                  isOwned ? "bg-card hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-lg" : "cursor-default border-dashed bg-muted/20"
                }`}
              >
                <span className="absolute left-3 top-3 z-10 rounded-md bg-black/65 px-2 py-1 text-xs font-bold text-white">
                  {formatDexNumber(number)}
                </span>
                {isOwned ? (
                  <>
                    <img
                      src={representative.pokemon.images.small}
                      alt={representative.pokemon.name}
                      loading="lazy"
                      className="mx-auto h-40 w-full object-contain transition group-hover:scale-105"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <strong className="truncate text-sm">{representative.pokemon.name}</strong>
                      {cards.length > 1 && <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-500">{cards.length} cartas</span>}
                    </div>
                    <p className="mt-1 text-xs text-emerald-500">Obtido</p>
                  </>
                ) : (
                  <div className="flex h-full min-h-44 flex-col items-center justify-center text-muted-foreground/60">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed text-2xl font-bold">?</div>
                    <span className="text-xs">Ainda não encontrado</span>
                  </div>
                )}
              </button>
            );
          })}
        </section>
      )}

      <Dialog open={selectedNumber !== null} onOpenChange={(open) => !open && setSelectedNumber(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedCards[0]?.pokemon.name} · {selectedNumber ? formatDexNumber(selectedNumber) : ""}</DialogTitle>
            <DialogDescription>Escolha qual das suas cartas aparecerá como representante desta espécie.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {selectedCards.map(({ collection, pokemon }) => {
              const isSelected = selectedNumber !== null && representatives[selectedNumber] === collection.id;
              return (
                <div key={collection.id} className={`rounded-xl border p-3 ${isSelected ? "border-amber-400 bg-amber-400/5" : "bg-card"}`}>
                  <img src={pokemon.images.small} alt={pokemon.name} className="mx-auto h-48 w-full object-contain" />
                  <p className="mt-2 truncate text-sm font-semibold">{pokemon.set.name}</p>
                  <p className="text-xs text-muted-foreground">#{pokemon.number} · {collection.language} · {collection.condition}</p>
                  <Button
                    className="mt-3 w-full gap-2"
                    size="sm"
                    variant={isSelected ? "secondary" : "default"}
                    disabled={isSelected || selectedNumber === null}
                    onClick={() => selectedNumber !== null && void chooseRepresentative(selectedNumber, collection.id, pokemon.name)}
                  >
                    {isSelected && <Check size={15} />}
                    {isSelected ? "Escolhida" : "Usar esta carta"}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
