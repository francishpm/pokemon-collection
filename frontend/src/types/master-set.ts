export type MasterSetVariant = "normal" | "reverse" | "holo" | "energy" | "pokeball" | "first_edition";

export interface MasterSetSlot {
  id: string;
  cardId: string;
  number: string;
  name: string;
  image: string;
  rarity?: string;
  variant: MasterSetVariant;
}

export interface MasterSetCatalog {
  id: string;
  name: string;
  logo?: string;
  totalCards: number;
  slots: MasterSetSlot[];
}

export interface MasterSetProgress {
  slotId: string;
  quantity: number;
}
