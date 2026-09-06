"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Award, BookOpen, Boxes, ChevronLeft, ChevronRight, Languages, Layers3, Sparkles, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCollection, type CollectionView } from "@/hooks/useCollection";
import { getGeneration } from "@/lib/getGeneration";
import { useCollectionStore } from "@/store/collectionStore";

const GENERATIONS = [
  { id: 1, label: "Kanto", color: "bg-red-500" },
  { id: 2, label: "Johto", color: "bg-amber-500" },
  { id: 3, label: "Hoenn", color: "bg-emerald-500" },
  { id: 4, label: "Sinnoh", color: "bg-blue-500" },
  { id: 5, label: "Unova", color: "bg-violet-500" },
  { id: 6, label: "Kalos", color: "bg-pink-500" },
  { id: 7, label: "Alola", color: "bg-orange-500" },
  { id: 8, label: "Galar", color: "bg-cyan-500" },
  { id: 9, label: "Paldea", color: "bg-indigo-500" },
] as const;

const LANGUAGE_LABELS: Record<string, string> = { PT: "Português", EN: "Inglês", JP: "Japonês" };
const CONDITION_LABELS: Record<string, string> = { M: "Mint", NM: "Near Mint", SP: "Slightly Played", MP: "Moderately Played", HP: "Heavily Played", D: "Danificada" };
const BAR_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500"];
const CARDS_PER_MODAL_PAGE = 30;

type CountItem = { label: string; value: number; color?: string };
type CardGroup = { title: string; description: string; cards: CollectionView[] };

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function ranked(map: Map<string, number>) {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function normalizeRarity(rarity?: string) {
  if (!rarity) return "Não informada";
  const value = rarity.replaceAll("_", " ").toLocaleLowerCase("pt-BR");
  if (value.includes("special illustration")) return "Ilustração especial";
  if (value.includes("illustration")) return "Ilustração rara";
  if (value.includes("ultra")) return "Ultra rara";
  if (value.includes("double rare")) return "Rara dupla";
  if (value.includes("promo")) return "Promocional";
  if (value.includes("uncommon") || value.includes("incomum")) return "Incomum";
  if (value.includes("common") || value.includes("comum")) return "Comum";
  if (value.includes("rare") || value.includes("rara")) return "Rara";
  return value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function MetricCard({ icon, label, value, detail, accent }: { icon: ReactNode; label: string; value: string; detail: string; accent: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className={`flex size-10 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function BarList({ items, onSelect, emptyText = "Ainda não há dados suficientes." }: { items: CountItem[]; onSelect?: (item: CountItem) => void; emptyText?: string }) {
  const maximum = Math.max(...items.map((item) => item.value), 1);
  if (items.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <button key={item.label} type="button" onClick={() => onSelect?.(item)} disabled={!onSelect} className="block w-full rounded-lg text-left outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none sm:-m-2 sm:w-[calc(100%+1rem)] sm:p-2">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 font-bold">{item.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${item.color ?? BAR_COLORS[index % BAR_COLORS.length]}`} style={{ width: `${Math.max(4, (item.value / maximum) * 100)}%` }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-card p-5 shadow-sm sm:p-6 ${className}`}>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </section>
  );
}

export default function StatisticsPage() {
  const { collectionView, carregandoValores } = useCollection();
  const fetchCards = useCollectionStore((state) => state.fetchCards);
  const isLoading = useCollectionStore((state) => state.isLoading);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<CardGroup | null>(null);
  const [groupPage, setGroupPage] = useState(1);

  useEffect(() => {
    void fetchCards().catch(() => undefined).finally(() => setInitialLoadPending(false));
  }, [fetchCards]);

  const stats = useMemo(() => {
    const species = new Map<number, { name: string; count: number; image: string }>();
    const sets = new Map<string, number>();
    const rarities = new Map<string, number>();
    const languages = new Map<string, number>();
    const conditions = new Map<string, number>();
    const generations = new Map<string, number>();

    for (const item of collectionView) {
      increment(sets, item.pokemon.set.name);
      increment(rarities, normalizeRarity(item.pokemon.rarity));
      increment(languages, LANGUAGE_LABELS[item.collection.language] ?? item.collection.language);
      increment(conditions, CONDITION_LABELS[item.collection.condition] ?? item.collection.condition);

      const number = item.pokemon.nationalPokedexNumbers?.[0];
      if (number) {
        const current = species.get(number);
        species.set(number, { name: item.pokemon.name, count: (current?.count ?? 0) + 1, image: current?.image ?? item.pokemon.images.small });
        increment(generations, String(getGeneration(number)));
      }
    }

    const topPokemon = [...species.entries()]
      .map(([number, value]) => ({ number, ...value }))
      .sort((a, b) => b.count - a.count || a.number - b.number)
      .slice(0, 5);
    const generationItems = GENERATIONS.map((generation) => ({
      label: generation.label,
      value: generations.get(String(generation.id)) ?? 0,
      color: generation.color,
    })).filter((item) => item.value > 0);
    const topSets = ranked(sets).slice(0, 6);
    const rarityItems = ranked(rarities).slice(0, 6);
    const languageItems = ranked(languages);
    const conditionItems = ranked(conditions);

    return { species, sets, topPokemon, generationItems, topSets, rarityItems, languageItems, conditionItems };
  }, [collectionView]);

  const dominantGeneration = stats.generationItems[0]
    ? [...stats.generationItems].sort((a, b) => b.value - a.value)[0]
    : null;
  const topPokemon = stats.topPokemon[0];
  const topSet = stats.topSets[0];
  const dominantLanguage = stats.languageItems[0];
  const loading = initialLoadPending || isLoading || carregandoValores;

  const openGroup = (title: string, cards: CollectionView[]) => {
    setGroupPage(1);
    setSelectedGroup({
      title,
      description: `${cards.length} ${cards.length === 1 ? "carta encontrada" : "cartas encontradas"} na sua coleção`,
      cards,
    });
  };
  const groupTotalPages = selectedGroup ? Math.max(1, Math.ceil(selectedGroup.cards.length / CARDS_PER_MODAL_PAGE)) : 1;
  const visibleGroupCards = selectedGroup?.cards.slice((groupPage - 1) * CARDS_PER_MODAL_PAGE, groupPage * CARDS_PER_MODAL_PAGE) ?? [];

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center text-muted-foreground"><div className="mx-auto mb-3 size-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />Calculando suas estatísticas...</div></div>;
  }

  if (collectionView.length === 0) {
    return <div className="rounded-2xl border bg-card p-12 text-center"><Sparkles className="mx-auto text-blue-500" size={36} /><h2 className="mt-4 text-xl font-bold">Sua história começa na primeira carta</h2><p className="mt-2 text-muted-foreground">Adicione cartas à coleção para descobrir suas estatísticas.</p></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Boxes size={20} />} label="Cartas guardadas" value={String(collectionView.length)} detail="Itens cadastrados na coleção" accent="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <MetricCard icon={<Users size={20} />} label="Pokémon únicos" value={String(stats.species.size)} detail="Espécies diferentes encontradas" accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <MetricCard icon={<Layers3 size={20} />} label="Expansões" value={String(stats.sets.size)} detail="Coleções diferentes representadas" accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        <MetricCard icon={<Trophy size={20} />} label="Mais colecionado" value={topPokemon?.name ?? "—"} detail={topPokemon ? `${topPokemon.count} cartas desse Pokémon` : "Nenhum Pokémon identificado"} accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sua coleção por geração" subtitle="De onde vêm os Pokémon que formam o seu acervo.">
          <BarList items={stats.generationItems} onSelect={(item) => {
            const generation = GENERATIONS.find((entry) => entry.label === item.label);
            openGroup(item.label, collectionView.filter(({ pokemon }) => {
              const number = pokemon.nationalPokedexNumbers?.[0];
              return number && generation ? getGeneration(number) === generation.id : false;
            }));
          }} />
        </Panel>

        <Panel title="Pokémon mais colecionados" subtitle="As espécies que mais aparecem entre suas cartas.">
          <div className="space-y-3">
            {stats.topPokemon.map((pokemon, index) => (
              <button type="button" key={pokemon.number} onClick={() => openGroup(pokemon.name, collectionView.filter(({ pokemon: card }) => card.nationalPokedexNumbers?.[0] === pokemon.number))} className="flex w-full items-center gap-3 rounded-xl bg-muted/60 p-3 text-left outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-black">{index + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pokemon.image} alt="" className="h-14 w-11 shrink-0 object-contain drop-shadow" />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{pokemon.name}</p><p className="text-xs text-muted-foreground">#{String(pokemon.number).padStart(3, "0")}</p></div>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">{pokemon.count} cartas</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Expansões favoritas" subtitle="As coleções com maior presença no seu fichário.">
          <BarList items={stats.topSets} onSelect={(item) => openGroup(item.label, collectionView.filter(({ pokemon }) => pokemon.set.name === item.label))} />
        </Panel>

        <Panel title="Raridades" subtitle="Como suas cartas estão distribuídas por raridade.">
          <BarList items={stats.rarityItems} onSelect={(item) => openGroup(item.label, collectionView.filter(({ pokemon }) => normalizeRarity(pokemon.rarity) === item.label))} />
        </Panel>

        <Panel title="Idiomas" subtitle="A diversidade de idiomas da sua coleção.">
          <BarList items={stats.languageItems} onSelect={(item) => openGroup(item.label, collectionView.filter(({ collection }) => (LANGUAGE_LABELS[collection.language] ?? collection.language) === item.label))} />
        </Panel>

        <Panel title="Conservação" subtitle="Condições registradas nas suas cartas.">
          <BarList items={stats.conditionItems} onSelect={(item) => openGroup(item.label, collectionView.filter(({ collection }) => (CONDITION_LABELS[collection.condition] ?? collection.condition) === item.label))} />
        </Panel>
      </div>

      <Panel title="O que sua coleção conta sobre você" subtitle="Curiosidades calculadas a partir do seu acervo." className="overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Award size={20} />, text: dominantGeneration ? `${dominantGeneration.label} é a geração mais presente, com ${dominantGeneration.value} cartas.` : "Sua geração favorita ainda é um mistério." },
            { icon: <Trophy size={20} />, text: topPokemon ? `${topPokemon.name} lidera sua coleção com ${topPokemon.count} aparições.` : "Nenhum Pokémon assumiu a liderança ainda." },
            { icon: <BookOpen size={20} />, text: topSet ? `${topSet.label} parece ser sua expansão favorita: ${topSet.value} cartas.` : "Sua expansão favorita ainda não apareceu." },
            { icon: <Languages size={20} />, text: dominantLanguage ? `${dominantLanguage.label} é o idioma predominante em ${Math.round((dominantLanguage.value / collectionView.length) * 100)}% da coleção.` : "Sua coleção ainda não tem um idioma predominante." },
          ].map((fact, index) => (
            <div key={index} className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><div className="mb-3 text-blue-100">{fact.icon}</div><p className="text-sm font-medium leading-relaxed">{fact.text}</p></div>
          ))}
        </div>
      </Panel>

      <Dialog open={selectedGroup !== null} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-5xl">
          {selectedGroup && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{selectedGroup.title}</DialogTitle>
                <DialogDescription>{selectedGroup.description}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {visibleGroupCards.map(({ collection, pokemon }) => (
                  <div key={collection.id} className="min-w-0 rounded-xl border bg-card p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pokemon.images.small} alt={pokemon.name} loading="lazy" className="mx-auto h-44 w-full object-contain drop-shadow-md sm:h-52" />
                    <p className="mt-2 truncate text-sm font-bold" title={pokemon.name}>{pokemon.name}</p>
                    <p className="truncate text-xs text-muted-foreground" title={pokemon.set.name}>{pokemon.set.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">{collection.language}</span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{collection.condition}</span>
                    </div>
                  </div>
                ))}
              </div>
              {groupTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 border-t pt-4">
                  <Button variant="outline" size="sm" onClick={() => setGroupPage((page) => Math.max(1, page - 1))} disabled={groupPage === 1}><ChevronLeft size={15} /> Anterior</Button>
                  <span className="min-w-20 text-center text-xs font-semibold">{groupPage} de {groupTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setGroupPage((page) => Math.min(groupTotalPages, page + 1))} disabled={groupPage === groupTotalPages}>Próxima <ChevronRight size={15} /></Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
