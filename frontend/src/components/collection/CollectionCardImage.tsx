import { PokemonCard } from "@/types/pokemon-card";
import { CardImage } from "./CardImage";

interface Props {
    pokemon: PokemonCard;
}

export function CollectionCardImage({ pokemon }: Props) {
    return (
        <CardImage
            src={pokemon.images.small}
            fallbackSrc={pokemon.images.large}
            alt={pokemon.name}
            loading="lazy"
            decoding="async"
            className="mx-auto h-40 md:h-72 w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
    );
}
