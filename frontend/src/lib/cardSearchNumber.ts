export function normalizeSearchNumber(value: string): string {
  return value.toLowerCase().replace(/^([a-z]*)0+(?=\d)/, "$1");
}

export function searchNumberVariants(value: string): string[] {
  const normalized = normalizeSearchNumber(value);
  return [...new Set([value, normalized, /^\d+$/.test(normalized) ? normalized.padStart(3, "0") : normalized])];
}
