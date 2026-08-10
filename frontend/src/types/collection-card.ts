export type CardCondition =
  | "M"
  | "NM"
  | "SP"
  | "MP"
  | "HP"
  | "D";

export type CardLanguage =
  | "PT"
  | "EN"
  | "JP";

export interface CollectionCard {
  id: string;

  pokemonCardId: string;

  language: CardLanguage;

  condition: CardCondition;

  acquisitionValue?: number;

  acquisitionDate?: string;
  ligaValue?: number;

  // Read-only market reference collected from matching Liga Pokémon listings.
  // This never replaces the value manually maintained in ligaValue.
  ligaLowestPrice?: number;
  ligaPriceCheckedAt?: string;
  ligaPriceUrl?: string;
  ligaPriceStatus?: "found" | "not_found" | "needs_confirmation" | "error";
  ligaPriceSourceTrust?: "trusted" | "unverified";

  createdAt: string;
  updatedAt?: string;

  notes?: string;

  // Snapshot stored with the collection record so other devices do not depend on
  // the external Pokémon API to render an existing card.
  pokemonData?: PokemonCard;
}
import { PokemonCard } from "@/types/pokemon-card";
