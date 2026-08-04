import { PokemonCard } from "@/types/pokemon-card";

interface Props {
    pokemon: PokemonCard;
}

export function CollectionCardImage({ pokemon }: Props) {
    return (
        <img
            src={pokemon.images.small}
            alt={pokemon.name}
            className="mx-auto h-40 md:h-72 w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
    );
}