export function prizePackSource(id: string) {
  const productId = id.match(/^prize-pack-(\d+)$/)?.[1];
  return productId ? `https://www.tcgplayer.com/product/${productId}` : "https://tcgpromos.com/pokemon-prize-pack-series-cards";
}
