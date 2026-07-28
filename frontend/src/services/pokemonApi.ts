import { PokemonCard } from "@/types/pokemon-card";

const BASE_URL = "https://api.pokemontcg.io/v2";

interface SearchResponse {
  data: PokemonCard[];
}

export async function searchCards(search: string): Promise<PokemonCard[]> {
  const term = search.trim();

  if (!term) return [];

  let query = "";

  // Pesquisa por número
  if (/^\d+$/.test(term)) {
    query = `number:${term}`;
  }

  // Qualquer outra coisa pesquisa por nome
  else {
    query = `name:"${term}*"`;
  }

  const response = await fetch(
    `${BASE_URL}/cards?q=${encodeURIComponent(query)}&pageSize=250`
  );

  if (!response.ok) {
    return [];
  }

  const data: SearchResponse = await response.json();

  return data.data;
}
interface GetCardResponse {
  data: PokemonCard;
}

export async function getCardById(
  id: string
): Promise<PokemonCard | null> {
  const response = await fetch(
    `${BASE_URL}/cards/${id}`
  );

  if (!response.ok) {
    return null;
  }

  const data: GetCardResponse =
    await response.json();

  return data.data;
}