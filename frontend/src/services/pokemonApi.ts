import { PokemonCard } from "@/types/pokemon-card";

const BASE_URL = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY || "";

interface SearchResponse {
  data: PokemonCard[];
  error?: string;
}

export async function searchCards(search: string): Promise<PokemonCard[]> {
  const term = search.trim();
  if (!term) return [];

  const response = await fetch(`/api/tcg/search?q=${encodeURIComponent(term)}`);
  const data = (await response.json()) as SearchResponse;
  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível consultar o catálogo de cartas.");
  }
  return data.data;
}

interface GetCardResponse {
  data: PokemonCard;
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers["X-Api-Key"] = API_KEY;

  try {
    const response = await fetch(`${BASE_URL}/cards/${id}`, { headers });
    if (!response.ok) return null;
    const data: GetCardResponse = await response.json();
    return data.data;
  } catch {
    return null;
  }
}
