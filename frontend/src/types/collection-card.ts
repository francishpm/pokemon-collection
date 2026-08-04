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

  createdAt: string;

  notes?: string;
}