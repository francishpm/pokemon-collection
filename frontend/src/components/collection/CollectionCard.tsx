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
}
export function CollectionCard({
    collection,
    pokemon,
    onDelete,
    onEdit,
    onClick,
}: Props) {
    return (
        <div
            onClick={onClick}
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
            />
        </div>
    );
}