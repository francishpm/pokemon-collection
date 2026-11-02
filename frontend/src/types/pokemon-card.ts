export interface PokemonCard {
  id: string;
  language?: "PT" | "EN" | "JP";
  prizePack?: {
    series: number[];
    variant: string;
    originalSet: string;
    source: string;
    imageUnavailable: boolean;
  };
  name: string;
  number: string;
  images: {
    small: string;
    large: string;
  };
  nationalPokedexNumbers?: number[];
  rarity?: string;
  supertype: string;
  subtypes: string[];
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    printedTotalLabel?: string;
    ligaEdition?: string;
  };
}
