import { CollectionCardImage } from "./CollectionCardImage";
import { CollectionCardInfo } from "./CollectionCardInfo";
import { CollectionCardActions } from "./CollectionCardActions";
import { CollectionCard as CollectionCardType } from "@/types/collection-card";
import { PokemonCard } from "@/types/pokemon-card";

interface Props {
    collection: CollectionCardType;
    pokemon: PokemonCard;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    onClick?: () => void;
    isPokedexRepresentative?: boolean;
    onSetPokedexRepresentative?: (id: string) => void;
}
export function CollectionCard({
    collection,
    pokemon,
    onDelete,
    onEdit,
    onClick,
    isPokedexRepresentative,
    onSetPokedexRepresentative,
}: Props) {
    return (
        <div
            onClick={onClick}
            data-collection-card="true"
            data-collection-id={collection.id}
            data-card-name={pokemon.name}
            data-card-number={pokemon.number}
            data-card-total={pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal}
            data-card-set={pokemon.set.name}
            data-card-edition={pokemon.set.ligaEdition}
            data-card-language={collection.language}
            data-card-condition={collection.condition}
            data-liga-price-status={collection.ligaPriceStatus}
            className="group relative cursor-pointer rounded-xl border bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
            <CollectionCardImage pokemon={pokemon} />

            <CollectionCardInfo
                collection={collection}
                pokemon={pokemon}
            />

            <CollectionCardActions
                id={collection.id}
                onEdit={onEdit}
                onDelete={onDelete}
                canRepresentPokedex={Boolean(pokemon.nationalPokedexNumbers?.[0])}
                isPokedexRepresentative={isPokedexRepresentative}
                onSetPokedexRepresentative={onSetPokedexRepresentative}
            />
        </div>
    );
}
