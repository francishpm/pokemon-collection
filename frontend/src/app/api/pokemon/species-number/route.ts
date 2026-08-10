import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function toSpeciesSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function speciesNameCandidates(name: string) {
  const candidates = new Set<string>();
  const add = (value: string) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized) candidates.add(normalized);
  };

  add(name);

  let baseName = name
    .replace(/\s+(?:ex|gx|v|vmax|vstar)\s*$/i, "")
    .replace(/-(?:ex|gx|v|vmax|vstar)\s*$/i, "")
    .replace(/^mega\s+/i, "")
    .replace(/^.+?'s\s+/i, "")
    .replace(/^(?:alolan|galarian|hisuian|paldean)\s+/i, "")
    .replace(/^(?:cornerstone|hearthflame|teal|wellspring)\s+mask\s+/i, "")
    .replace(/\s*\([^)]*\)\s*$/i, "")
    .trim();

  add(baseName);
  baseName = baseName
    .replace(/\s+(?:ex|gx|v|vmax|vstar)\s*$/i, "")
    .replace(/^mega\s+/i, "")
    .replace(/^.+?'s\s+/i, "")
    .trim();
  add(baseName);

  return [...candidates];
}

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });

  try {
    for (const candidate of speciesNameCandidates(name)) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${toSpeciesSlug(candidate)}`, {
        cache: "force-cache",
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) continue;

      const species = await response.json() as { id?: number };
      if (species.id) return NextResponse.json({ number: species.id });
    }

    return NextResponse.json({ number: null });
  } catch {
    return NextResponse.json({ number: null });
  }
}
