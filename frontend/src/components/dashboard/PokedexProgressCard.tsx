import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PokedexProgressCardProps {
    pokedexCount: number;
    totalPokemon: number;
    pokedexProgress: number;
}

export function PokedexProgressCard({
    pokedexCount,
    totalPokemon,
    pokedexProgress,
}: PokedexProgressCardProps) {
    const remainingPokemon = totalPokemon - pokedexCount;

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle>📖 Minha Pokédex</CardTitle>
            </CardHeader>

            <CardContent className="flex h-full flex-col justify-between">

                <div className="text-center">

                    <p className="text-4xl font-bold text-slate-900">
                        {pokedexProgress}%
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        Completa
                    </p>

                </div>

                <Progress
                    value={pokedexProgress}
                    className="mt-6"
                />

                <div className="mt-6 space-y-1 text-sm">

                    <div className="flex justify-between">
                        <span className="text-slate-500">
                            Registrados
                        </span>

                        <span className="font-semibold">
                            {pokedexCount}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-slate-500">
                            Faltam
                        </span>

                        <span className="font-semibold">
                            {remainingPokemon}
                        </span>
                    </div>

                </div>

            </CardContent>
        </Card>
    );
}