const UNKNOWN_POKEDEX_NUMBER = Number.MAX_SAFE_INTEGER;

export function comparePokedexNumbers(a?: number[], b?: number[]) {
  const first = a?.[0] ?? UNKNOWN_POKEDEX_NUMBER;
  const second = b?.[0] ?? UNKNOWN_POKEDEX_NUMBER;
  return first - second;
}
