export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseCurrency(value: string): number {
  const numbers = value.replace(/\D/g, "");
  return Number(numbers) / 100;
}