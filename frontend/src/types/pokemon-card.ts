export interface TcgPlayerPrice {
  low?: number;
  mid?: number;
  market?: number;
}

export interface PokemonCard {
  id: string;
  language?: "PT" | "EN" | "JP";
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
  // ADICIONAMOS ISSO AQUI PARA O NOSSO CÁLCULO FINANCEIRO
  tcgplayer?: {
    prices?: Record<string, TcgPlayerPrice>;
  };
}
