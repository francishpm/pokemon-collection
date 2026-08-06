import { PokemonCard } from "@/types/pokemon-card";

export interface WishlistCard {
  id: string;
  pokemonCardId: string;
  createdAt: string;
  pokemonData?: PokemonCard;
}
