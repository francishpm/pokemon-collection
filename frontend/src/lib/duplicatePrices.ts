export function parseDuplicatePrice(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Informe um preço válido, como 12,50.");
  const price = Number(normalized);
  if (!Number.isSafeInteger(Math.round(price * 100))) throw new Error("Preço muito alto.");
  return price;
}

export function duplicatePriceLabel(price: number | null | undefined): string {
  return price == null ? "" : `${price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / un.`;
}
