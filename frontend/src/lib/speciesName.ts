/** Normalize card decorations without guessing from partial species names. */
export function speciesNameCandidates(name: string) {
  const clean = (value: string) => value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[’]/g, "'")
    .replace(/\s+/g, " ").trim().toLowerCase();
  const aliases: Record<string, string> = { "maos ferreas": "iron hands" };
  const candidates = new Set<string>();
  const add = (value: string) => {
    if (value) candidates.add(aliases[value] ?? value);
  };
  let base = clean(name);
  // Try the species first, rather than waiting for a request for the decorated title.
  for (let pass = 0; pass < 3; pass++) {
    base = base
      .replace(/\s+(?:de|do|da|dos|das)\s+.+$/i, "")
      .replace(/(?:\s+|-)(?:ex|gx|v|vmax|vstar)\s*$/i, "")
      .replace(/^mega\s+/i, "")
      .replace(/^.+?'s\s+/i, "")
      .replace(/^(?:alolan|galarian|hisuian|paldean)\s+/i, "")
      .replace(/^(?:cornerstone|hearthflame|teal|wellspring)\s+mask\s+/i, "")
      .replace(/\s+(?:forma|form|mascara)\s+.+$/i, "")
      .replace(/\s+(?:sunny|rainy|snowy)\s+form$/i, "")
      .replace(/\s*\([^)]*\)\s*$/i, "").trim();
  }
  add(base);
  add(clean(name));
  return [...candidates];
}
