export interface PriceHistory {
  id: string;
  collectionCardId: string;
  price: number;
  createdAt: string;
  source: "manual" | "liga_reference";
  sourceTrust?: "trusted" | "unverified";
}
