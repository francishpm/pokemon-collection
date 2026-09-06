"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Loader2, RefreshCw, Search, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCollection, type CollectionView } from "@/hooks/useCollection";
import { getGeneration } from "@/lib/getGeneration";
import { useCollectionStore } from "@/store/collectionStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { PokemonCard } from "@/types/pokemon-card";
import { savePokemonInCache } from "@/services/pokemonCache";

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

interface SpecialArtworksResponse {
  speciesName?: string;
  cards?: PokemonCard[];
  error?: string;
}

export default function PokedexPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [generation, setGeneration] = useState("1");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [missingNumber, setMissingNumber] = useState<number | null>(null);
  const [missingSpeciesName, setMissingSpeciesName] = useState("");
  const [specialArtworks, setSpecialArtworks] = useState<PokemonCard[]>([]);
  const [loadingSpecialArtworks, setLoadingSpecialArtworks] = useState(false);
  const [addingArtworkId, setAddingArtworkId] = useState<string | null>(null);
  const [speciesNames, setSpeciesNames] = useState<Record<number, string>>({});
  const [desiredNumber, setDesiredNumber] = useState<number | null>(null);
  const { collectionView } = useCollection();
  const fetchCards = useCollectionStore((state) => state.fetchCards);
  const representatives = useCollectionStore((state) => state.pokedexRepresentatives);
  const setRepresentative = useCollectionStore((state) => state.setPokedexRepresentative);
  const wishlistItems = useWishlistStore((state) => state.items);
  const fetchWishlistItems = useWishlistStore((state) => state.fetchItems);
  const addWishlistItem = useWishlistStore((state) => state.addItem);

  useEffect(() => {
    void fetchCards().catch(() => toast.error("Não foi possível carregar sua Pokédex."));
    void fetchWishlistItems().catch(() => console.warn("Não foi possível carregar a Wishlist."));
    void fetch("/api/pokemon/species-list")
      .then(async (response) => {
        if (!response.ok) throw new Error("Catálogo de espécies indisponível");
        return response.json() as Promise<{ species?: Array<{ number: number; name: string }> }>;
      })
      .then(({ species = [] }) => {
        setSpeciesNames(Object.fromEntries(species.map(({ number, name }) => [number, name])));
      })
      .catch(() => console.warn("Não foi possível carregar os nomes da Pokédex."));
  }, [fetchCards, fetchWishlistItems]);

  const cardsByPokedexNumber = useMemo(() => {
    const grouped = new Map<number, CollectionView[]>();
    for (const item of collectionView) {
      const number = item.pokemon.nationalPokedexNumbers?.[0];
      if (!number) continue;
      grouped.set(number, [...(grouped.get(number) ?? []), item]);
    }
    return grouped;
  }, [collectionView]);

  const wishlistByPokedexNumber = useMemo(() => {
    const mapped = new Map<number, NonNullable<(typeof wishlistItems)[number]["pokemonData"]>>();
    for (const item of wishlistItems) {
      const pokemon = item.pokemonData;
      const number = pokemon?.nationalPokedexNumbers?.[0];
      if (pokemon && number && !mapped.has(number)) mapped.set(number, pokemon);
    }
    return mapped;
  }, [wishlistItems]);

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

      return String(number).includes(term)
        || speciesNames[number]?.toLocaleLowerCase("pt-BR").includes(term)
        || cards?.some(({ pokemon }) => pokemon.name.toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [cardsByPokedexNumber, search, selectedGeneration, speciesNames, status]);

  const selectedCards = selectedNumber ? cardsByPokedexNumber.get(selectedNumber) ?? [] : [];
  const desiredArtwork = desiredNumber ? wishlistByPokedexNumber.get(desiredNumber) : undefined;

  const chooseRepresentative = async (number: number, cardId: string, pokemonName: string) => {
    try {
      await setRepresentative(number, cardId);
      toast.success(`${pokemonName} agora representa o ${formatDexNumber(number)} na Pokédex.`);
    } catch {
      toast.error("Não foi possível salvar essa escolha.");
    }
  };

  const openSpecialArtworks = async (number: number) => {
    const speciesName = speciesNames[number] ?? "";
    setMissingNumber(number);
    setMissingSpeciesName(speciesName);
    setSpecialArtworks([]);
    setLoadingSpecialArtworks(true);
    try {
      const params = new URLSearchParams({ number: String(number) });
      if (speciesName) params.set("name", speciesName);
      const response = await fetch(`/api/pokemon/special-artworks?${params}`);
      const data = await response.json() as SpecialArtworksResponse;
      if (!response.ok) throw new Error(data.error ?? "Não foi possível buscar as artes especiais.");
      setMissingSpeciesName(data.speciesName ?? "Pokémon");
      setSpecialArtworks(data.cards ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível buscar as artes especiais.");
    } finally {
      setLoadingSpecialArtworks(false);
    }
  };

  const addArtworkToWishlist = async (pokemon: PokemonCard) => {
    setAddingArtworkId(pokemon.id);
    try {
      await addWishlistItem({
        id: crypto.randomUUID(),
        pokemonCardId: pokemon.id,
        pokemonData: pokemon,
        createdAt: new Date().toISOString(),
      });
      savePokemonInCache(pokemon);
      toast.success(`${pokemon.name} · ${pokemon.set.name} adicionada à Wishlist!`);
    } catch {
      toast.error("Não foi possível adicionar esta arte à Wishlist.");
    } finally {
      setAddingArtworkId(null);
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
            const wishedArtwork = !isOwned ? wishlistByPokedexNumber.get(number) : undefined;
            const isDesired = Boolean(wishedArtwork);
            const speciesName = speciesNames[number] ?? `Pokémon ${formatDexNumber(number)}`;

            return (
              <button
                key={number}
                type="button"
                onClick={() => isOwned ? setSelectedNumber(number) : isDesired ? setDesiredNumber(number) : void openSpecialArtworks(number)}
                className={`group relative min-h-52 overflow-hidden rounded-xl border p-3 text-left transition ${
                  isOwned
                    ? "bg-card hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-lg"
                    : isDesired
                      ? "border-dashed border-blue-500/60 bg-blue-500/[0.06] hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10"
                    : "border-dashed bg-muted/20 hover:-translate-y-1 hover:border-violet-500/60 hover:bg-violet-500/5 hover:shadow-lg"
                }`}
                aria-label={isOwned ? `Ver cartas de ${speciesName}` : isDesired ? `Ver arte desejada de ${speciesName}` : `Buscar artes especiais de ${speciesName}`}
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
                ) : wishedArtwork ? (
                  <>
                    <div className="relative mx-auto h-40 w-full overflow-hidden rounded-lg">
                      <img
                        src={wishedArtwork.images.small}
                        alt={`Arte desejada de ${speciesName}`}
                        loading="lazy"
                        className="h-full w-full object-contain saturate-[.7] brightness-[.78] transition group-hover:scale-105 group-hover:saturate-100"
                      />
                      <div className="absolute inset-0 bg-blue-500/10" />
                      <span className="absolute -right-9 top-5 rotate-45 bg-blue-600 px-10 py-1 text-[10px] font-black tracking-wider text-white shadow-md">
                        DESEJADA
                      </span>
                      <span className="absolute bottom-1 right-1 rounded-full bg-blue-600 p-1.5 text-white shadow">
                        <Star size={13} fill="currentColor" />
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <strong className="truncate text-sm">{speciesName}</strong>
                      <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-500">OBJETIVO</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-blue-500/80">{wishedArtwork.set.name}</p>
                  </>
                ) : (
                  <div className="flex h-full min-h-44 flex-col items-center justify-center text-muted-foreground/60 transition-colors group-hover:text-violet-500">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed text-2xl font-bold transition-transform group-hover:scale-105">?</div>
                    <strong className="text-sm text-foreground/80 transition-colors group-hover:text-violet-500">{speciesName}</strong>
                    <span className="mt-1 text-xs">Ainda não encontrado</span>
                    <span className="mt-1 text-[11px] font-semibold opacity-60 transition-opacity group-hover:opacity-100">Buscar artes especiais</span>
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

      <Dialog open={desiredNumber !== null} onOpenChange={(open) => !open && setDesiredNumber(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{desiredArtwork?.name ?? "Arte desejada"} · {desiredNumber ? formatDexNumber(desiredNumber) : ""}</DialogTitle>
            <DialogDescription>Esta é a arte que você planejou para ocupar este espaço da Pokédex.</DialogDescription>
          </DialogHeader>
          {desiredArtwork && (
            <div className="rounded-xl border border-dashed border-blue-500/60 bg-blue-500/[0.06] p-4">
              <div className="relative mx-auto w-fit overflow-hidden rounded-lg">
                <img src={desiredArtwork.images.small} alt={desiredArtwork.name} className="h-64 object-contain saturate-[.8]" />
                <span className="absolute -right-9 top-5 rotate-45 bg-blue-600 px-10 py-1 text-[10px] font-black tracking-wider text-white">DESEJADA</span>
              </div>
              <p className="mt-3 text-center font-semibold">{desiredArtwork.set.name}</p>
              <p className="text-center text-xs text-muted-foreground">#{desiredArtwork.number} · {desiredArtwork.rarity ?? "Arte especial"}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" className="gap-2" onClick={() => router.push("/wishlist")}>
              <Heart size={16} /> Ver na Wishlist
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                const number = desiredNumber;
                setDesiredNumber(null);
                if (number) void openSpecialArtworks(number);
              }}
            >
              <RefreshCw size={16} /> Trocar arte
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={missingNumber !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMissingNumber(null);
            setSpecialArtworks([]);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {missingSpeciesName || "Artes especiais"} · {missingNumber ? formatDexNumber(missingNumber) : ""}
            </DialogTitle>
            <DialogDescription>
              Escolha uma Full Art, Illustration Rare ou outra arte especial para adicionar diretamente à sua Wishlist.
            </DialogDescription>
          </DialogHeader>

          {loadingSpecialArtworks ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="animate-spin text-violet-500" size={28} />
              <p>Procurando todas as artes especiais...</p>
            </div>
          ) : specialArtworks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <Sparkles className="mx-auto text-muted-foreground" size={28} />
              <h3 className="mt-3 font-semibold">Nenhuma arte especial encontrada</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                O catálogo ainda não possui uma Full Art ou arte alternativa identificada para esta espécie.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {specialArtworks.map((pokemon) => {
                const alreadyInWishlist = wishlistItems.some((item) => item.pokemonCardId === pokemon.id);
                const isAdding = addingArtworkId === pokemon.id;

                return (
                  <article key={pokemon.id} className="flex flex-col rounded-xl border bg-card p-3">
                    <div className="relative">
                      <img
                        src={pokemon.images.small}
                        alt={`${pokemon.name} — ${pokemon.set.name}`}
                        loading="lazy"
                        className="mx-auto h-56 w-full object-contain"
                      />
                      {pokemon.rarity && (
                        <span className="absolute bottom-1 left-1 rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold text-white shadow">
                          {pokemon.rarity}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 truncate text-sm font-bold">{pokemon.name}</h3>
                    <p className="truncate text-xs text-muted-foreground">{pokemon.set.name}</p>
                    <p className="text-xs text-muted-foreground">#{pokemon.number}/{pokemon.set.printedTotal || "?"}</p>
                    <Button
                      size="sm"
                      variant={alreadyInWishlist ? "secondary" : "default"}
                      className="mt-3 w-full gap-2"
                      disabled={alreadyInWishlist || isAdding}
                      onClick={() => void addArtworkToWishlist(pokemon)}
                    >
                      {isAdding ? <Loader2 size={15} className="animate-spin" /> : alreadyInWishlist ? <Check size={15} /> : <Heart size={15} />}
                      {alreadyInWishlist ? "Na Wishlist" : isAdding ? "Adicionando" : "Adicionar à Wishlist"}
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
