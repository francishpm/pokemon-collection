export function isValidTradeQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 2147483647;
}
