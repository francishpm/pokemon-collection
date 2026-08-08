"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FolderOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { getGeneration } from "@/lib/getGeneration";
import { PokemonCard } from "@/types/pokemon-card";

interface PublicCollectionItem {
  condition: string;
  language: string;
  pokemon_data: PokemonCard;
}

type TypeFilter = "all" | "pokemon" | "trainer";

function isTrainer(card: PokemonCard) {
  const labels = [card.supertype ?? "", ...(card.subtypes ?? [])]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /trainer|treinador|supporter|item|stadium|tool/.test(labels);
}

export default function PublicCollectionPage() {
  const token = useParams().token as string;
  const [items, setItems] = useState<PublicCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [generation, setGeneration] = useState("all");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_collection", { share_token: token });
      if (error) console.error("Erro ao carregar coleção pública:", error);
      if (active) {
        setItems(error ? [] : (data ?? []) as PublicCollectionItem[]);
        setLoading(false);
      }
    };
    if (token) void load();
    return () => { active = false; };
  }, [token]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(({ pokemon_data: card }) => {
      const trainer = isTrainer(card);
      if (typeFilter === "trainer" && !trainer) return false;
      if (typeFilter === "pokemon" && trainer) return false;

      if (generation !== "all") {
        const dexNumber = card.nationalPokedexNumbers?.[0];
        if (!dexNumber || getGeneration(dexNumber) !== Number(generation)) return false;
      }

      if (!term) return true;
      const fullNumber = `${card.number}/${card.set.printedTotalLabel ?? card.set.printedTotal}`.toLowerCase();
      return card.name.toLowerCase().includes(term)
        || fullNumber.includes(term)
        || card.set.name.toLowerCase().includes(term);
    });
  }, [generation, items, search, typeFilter]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500">
            <FolderOpen size={30} />
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Coleção CardDex</h1>
          <p className="text-muted-foreground">{items.length} cartas compartilhadas</p>
        </header>

        <section className="grid gap-2 rounded-xl border bg-card p-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar carta, número ou coleção..." className="pl-10" />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => {
              const value = event.target.value as TypeFilter;
              setTypeFilter(value);
              if (value === "trainer") setGeneration("all");
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todos os tipos</option>
            <option value="pokemon">Pokémon</option>
            <option value="trainer">Treinadores</option>
          </select>
          <select
            value={generation}
            disabled={typeFilter === "trainer"}
            onChange={(event) => setGeneration(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="all">Todas as gerações</option>
            {Array.from({ length: 9 }, (_, index) => index + 1).map((gen) => (
              <option key={gen} value={gen}>Geração {gen}</option>
            ))}
          </select>
        </section>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Carregando coleção...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <h2 className="text-lg font-semibold">Coleção indisponível</h2>
            <p className="mt-2 text-sm text-muted-foreground">Este link pode estar desativado ou ainda não possui cartas.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">Nenhuma carta encontrada com esses filtros.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredItems.map(({ pokemon_data: card, condition, language }, index) => (
              <article key={`${card.id}-${index}`} className="rounded-xl border bg-card p-3 shadow-sm">
                <img src={card.images.small} alt={card.name} loading="lazy" decoding="async" className="mx-auto h-48 w-full object-contain md:h-56" />
                <div className="mt-3 text-center">
                  <h2 className="truncate text-sm font-bold" title={card.name}>{card.name}</h2>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">
                    #{card.number}/{card.set.printedTotalLabel ?? card.set.printedTotal} • {card.set.name}
                  </p>
                  <div className="mt-2 flex justify-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">{condition}</span>
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-500">{language}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          Valores e informações privadas não são exibidos nesta página.
        </footer>
      </div>
    </main>
  );
}
