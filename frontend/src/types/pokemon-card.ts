export interface PokemonCard {
  id: string;
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
    ligaEdition?: string;
  };
  // ADICIONAMOS ISSO AQUI PARA O NOSSO CÁLCULO FINANCEIRO
  tcgplayer?: {
    prices?: any;
  };
}