export const TRADE_VARIANT_MAX_LENGTH = 40;

export function normalizeTradeVariant(value?: string | null) {
  const label = value?.trim() ?? "";
  if (label.length > TRADE_VARIANT_MAX_LENGTH) throw new Error("A variante deve ter até 40 caracteres.");
  return label || null;
}
