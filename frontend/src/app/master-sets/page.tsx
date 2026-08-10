"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Layers3 } from "lucide-react";

const SERIES = {
  id: "me",
  name: "Mega Evolution",
  logo: "https://assets.tcgdex.net/en/me/me01/logo.webp",
};

const SETS = [
  { id: "me05", name: "Pitch Black", cards: 120 },
  { id: "me04", name: "Chaos Rising", cards: 122 },
  { id: "me03", name: "Perfect Order", cards: 124 },
  { id: "me02.5", name: "Ascended Heroes", cards: 295 },
  { id: "me02", name: "Phantasmal Flames", cards: 130 },
  { id: "me01", name: "Mega Evolution", cards: 188 },
];

function setLogoUrl(setId: string) {
  const extension = setId === "me05" ? "png" : "webp";
  return `https://assets.tcgdex.net/en/me/${setId}/logo.${extension}`;
}

export default function MasterSetsPage() {
  const [selectedSeries, setSelectedSeries] = useState(false);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Layers3 className="text-blue-500" size={20} />
          <h2 className="text-lg font-bold">Séries disponíveis</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <button onClick={() => setSelectedSeries((current) => !current)} className={`rounded-xl border p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-500 ${selectedSeries ? "border-blue-500 bg-blue-500/5" : "bg-card"}`}>
            <img src={SERIES.logo} alt={SERIES.name} className="mx-auto h-16 w-full object-contain" />
            <h3 className="mt-4 font-bold">{SERIES.name}</h3>
            <span className="mt-2 inline-flex rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-500">
              6 coleções
            </span>
          </button>
        </div>
      </section>

      {selectedSeries ? <section className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">{SERIES.name}</p>
          <h2 className="mt-1 text-xl font-black">Escolha uma coleção</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cada Master Set possui progresso e variantes independentes.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {SETS.map((set) => (
            <Link key={set.id} href={`/master-sets/${set.id}`} className="group rounded-xl border bg-background p-4 transition hover:-translate-y-1 hover:border-blue-500/60 hover:shadow-lg">
              <img src={setLogoUrl(set.id)} alt={set.name} className="mx-auto h-20 w-full object-contain" />
              <div className="mt-4 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold group-hover:text-blue-500">{set.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{set.cards} cartas-base</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground group-hover:text-blue-500" />
              </div>
            </Link>
          ))}
        </div>
      </section> : <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">Selecione Mega Evolution para ver as seis coleções.</div>}
    </div>
  );
}
