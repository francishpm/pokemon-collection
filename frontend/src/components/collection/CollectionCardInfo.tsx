import { CollectionCard } from "@/types/collection-card";
import { PokemonCard } from "@/types/pokemon-card";

interface Props {
    collection: CollectionCard;
    pokemon: PokemonCard;
}

export function CollectionCardInfo({
    collection,
    pokemon,
}: Props) {
    // Garante que a data YYYY-MM-DD seja formatada certinho para o BR
    const formatarData = (dataStr?: string) => {
        if (!dataStr) return "";
        const [ano, mes, dia] = dataStr.split("T")[0].split("-");
        return `${dia}/${mes}/${ano}`;
    };

    const updatedAtFormatada = formatarData(collection.updatedAt);

    return (
        <div className="mt-1 flex flex-col items-center gap-1 text-center">
            <h3 className="line-clamp-2 h-11 text-base font-bold leading-5">
                {pokemon.name}
            </h3>

            <p className="text-xs text-muted-foreground">
                #{pokemon.number}/{pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal} • {pokemon.set.name}
            </p>

            <div className="flex justify-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {collection.condition}
                </span>

                <span className="rounded-full bg-blue-100 px-3 py-0.5 text-[10px] font-semibold text-blue-700">
                    {collection.language}
                </span>
            </div>

            <div className="mt-1.5 flex flex-col items-center">
                {/* VALOR DA LIGA (Ou Aviso) */}
                {collection.ligaValue ? (
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent">
                        {collection.ligaValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                ) : (
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                        ⚠️ Faltando Preço
                    </span>
                )}

                {updatedAtFormatada && (
                    <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                        Última atualização: {updatedAtFormatada}
                    </span>
                )}
            </div>
        </div>
    );
}
