export interface PricedLigaOffer<T> {
  offer: T;
  price: number;
  trusted: boolean;
}

export function selectLowestPreferredLigaOffer<T>(
  offers: PricedLigaOffer<T>[],
): PricedLigaOffer<T> | null {
  const validOffers = offers.filter(({ price }) => Number.isFinite(price) && price > 0);
  const trustedOffers = validOffers.filter(({ trusted }) => trusted);
  const candidates = trustedOffers.length > 0 ? trustedOffers : validOffers;

  return candidates.reduce<PricedLigaOffer<T> | null>(
    (lowest, current) => !lowest || current.price < lowest.price ? current : lowest,
    null,
  );
}
