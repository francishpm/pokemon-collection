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
    return (
        <div className="mt-1 flex flex-col items-center gap-1 text-center">
            <h3 className="line-clamp-2 h-11 text-base font-bold leading-5">
                {pokemon.name}
            </h3>

            <p className="text-xs text-muted-foreground">
                #{pokemon.number}/{pokemon.set.printedTotal} • {pokemon.set.name}
            </p>

            <div className="flex justify-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {collection.condition}
                </span>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {collection.language}
                </span>
            </div>

            <div className="mt-1">
                {collection.acquisitionValue ? (
                    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                        {collection.acquisitionValue.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                        })}
                    </span>
                ) : (
                    <span className="text-xs italic text-muted-foreground">
                        Preço não informado
                    </span>
                )}
            </div>
        </div>
    );
}