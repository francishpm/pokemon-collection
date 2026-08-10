import { NextResponse } from "next/server";

const SPECIAL_NAMES: Record<string, string> = {
  "farfetchd": "Farfetch’d",
  "flabebe": "Flabébé",
  "ho-oh": "Ho-Oh",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  "mime-jr": "Mime Jr.",
  "mr-mime": "Mr. Mime",
  "mr-rime": "Mr. Rime",
  "nidoran-f": "Nidoran♀",
  "nidoran-m": "Nidoran♂",
  "porygon-z": "Porygon-Z",
  "sirfetchd": "Sirfetch’d",
  "type-null": "Type: Null",
  "wo-chien": "Wo-Chien",
  "chien-pao": "Chien-Pao",
  "ting-lu": "Ting-Lu",
  "chi-yu": "Chi-Yu",
};

function formatSpeciesName(slug: string) {
  if (SPECIAL_NAMES[slug]) return SPECIAL_NAMES[slug];
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function GET() {
  try {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon-species?limit=1025", {
      next: { revalidate: 604_800 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Catálogo de espécies indisponível");

    const data = await response.json() as {
      results: Array<{ name: string; url: string }>;
    };
    const species = data.results.map(({ name, url }, index) => {
      const numberFromUrl = Number(url.match(/\/pokemon-species\/(\d+)\/?$/)?.[1]);
      return {
        number: Number.isInteger(numberFromUrl) ? numberFromUrl : index + 1,
        name: formatSpeciesName(name),
      };
    });

    return NextResponse.json({ species });
  } catch (error) {
    console.error("Erro ao carregar nomes da Pokédex:", error);
    return NextResponse.json({ error: "Não foi possível carregar os nomes da Pokédex." }, { status: 502 });
  }
}
