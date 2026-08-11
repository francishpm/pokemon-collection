import { CollectionCardImage } from "./CollectionCardImage";
import { CollectionCardInfo } from "./CollectionCardInfo";
import { CollectionCardActions } from "./CollectionCardActions";
import { CollectionCard as CollectionCardType } from "@/types/collection-card";
import { PokemonCard } from "@/types/pokemon-card";
import { Check, Square } from "lucide-react";

interface Props {
    collection: CollectionCardType;
    pokemon: PokemonCard;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    onClick?: () => void;
    isPokedexRepresentative?: boolean;
    onSetPokedexRepresentative?: (id: string) => void;
    isPriceSelected?: boolean;
    onTogglePriceSelection?: (id: string) => void;
}
export function CollectionCard({
    collection,
    pokemon,
    onDelete,
    onEdit,
    onClick,
    isPokedexRepresentative,
    onSetPokedexRepresentative,
    isPriceSelected,
    onTogglePriceSelection,
}: Props) {
    return (
        <div
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-pressed={onClick ? isPriceSelected : undefined}
            onKeyDown={(event) => {
                if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                onClick();
            }}
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
            className={`group relative cursor-pointer rounded-xl border bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isPriceSelected ? "border-blue-500 ring-2 ring-blue-500/20" : ""}`}
        >
            {onTogglePriceSelection && <button type="button" aria-pressed={isPriceSelected} onClick={(event) => { event.stopPropagation(); onTogglePriceSelection(collection.id); }} className={`absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-colors ${isPriceSelected ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background/90 text-muted-foreground hover:border-blue-500 hover:text-blue-500"}`} title={isPriceSelected ? "Remover da atualização" : "Selecionar para atualizar preço"}>{isPriceSelected ? <Check size={16} /> : <Square size={15} />}</button>}
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
