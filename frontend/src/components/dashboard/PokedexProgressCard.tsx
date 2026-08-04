"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CollectionView } from "@/hooks/useCollection";
import { getGeneration } from "@/lib/getGeneration";

interface PokedexProgressCardProps {
    collectionView: CollectionView[];
}

// Quantidade exata de Pokémon introduzidos em cada geração
const GEN_TOTALS: Record<number, number> = {
    1: 151, // Kanto
    2: 100, // Johto
    3: 135, // Hoenn
    4: 107, // Sinnoh
    5: 156, // Unova
    6: 72,  // Kalos
    7: 88,  // Alola
    8: 96,  // Galar
    9: 120, // Paldea
};

export function PokedexProgressCard({ collectionView }: PokedexProgressCardProps) {
    const [genFilter, setGenFilter] = useState("all");

    // Lógica para calcular os totais dinamicamente
    const stats = useMemo(() => {
        // Pega todos os números de Pokédex únicos que você já tem
        const uniquePokemon = new Set<number>();
        collectionView.forEach((item) => {
            item.pokemon.nationalPokedexNumbers?.forEach((num) => uniquePokemon.add(num));
        });

        if (genFilter === "all") {
            const total = 1025;
            const registered = uniquePokemon.size;
            return {
                registered,
                total,
                percentage: Number(((registered / total) * 100).toFixed(1))
            };
        }

        const targetGen = Number(genFilter);
        const total = GEN_TOTALS[targetGen];
        
        let registered = 0;
        uniquePokemon.forEach((num) => {
            if (getGeneration(num) === targetGen) {
                registered++;
            }
        });

        return {
            registered,
            total,
            percentage: Number(((registered / total) * 100).toFixed(1))
        };
    }, [collectionView, genFilter]);

    return (
        <Card className="h-full flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-semibold">Minha Pokédex</CardTitle>
                <select
                    value={genFilter}
                    onChange={(e) => setGenFilter(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Todas as Gerações</option>
                    <option value="1">Gen 1 (Kanto)</option>
                    <option value="2">Gen 2 (Johto)</option>
                    <option value="3">Gen 3 (Hoenn)</option>
                    <option value="4">Gen 4 (Sinnoh)</option>
                    <option value="5">Gen 5 (Unova)</option>
                    <option value="6">Gen 6 (Kalos)</option>
                    <option value="7">Gen 7 (Alola)</option>
                    <option value="8">Gen 8 (Galar)</option>
                    <option value="9">Gen 9 (Paldea)</option>
                </select>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col justify-center">
                <div className="text-center py-4">
                    <p className="text-5xl font-black text-blue-600 tracking-tight">
                        {stats.percentage}%
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        Completa
                    </p>
                </div>

                <Progress
                    value={stats.percentage}
                    className="h-3 w-full bg-slate-100"
                />

                <div className="mt-6 flex justify-between border-t border-slate-100 pt-4 text-sm">
                    <div className="flex flex-col">
                        <span className="text-slate-500">Registrados</span>
                        <span className="font-bold text-slate-700">{stats.registered}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-slate-500">Faltam</span>
                        <span className="font-bold text-slate-700">{stats.total - stats.registered}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}