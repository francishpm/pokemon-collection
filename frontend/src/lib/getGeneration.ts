export function getGeneration(
  nationalDex: number
): number {

  if (nationalDex <= 151) return 1;

  if (nationalDex <= 251) return 2;

  if (nationalDex <= 386) return 3;

  if (nationalDex <= 493) return 4;

  if (nationalDex <= 649) return 5;

  if (nationalDex <= 721) return 6;

  if (nationalDex <= 809) return 7;

  if (nationalDex <= 905) return 8;

  return 9;
}