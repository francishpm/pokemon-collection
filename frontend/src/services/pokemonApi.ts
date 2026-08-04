import { PokemonCard } from "@/types/pokemon-card";

const BASE_URL = "https://api.pokemontcg.io/v2";

const API_KEY = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY || "";

interface SearchResponse {
  data: PokemonCard[];
}

export async function searchCards(search: string): Promise<PokemonCard[]> {
  const term = search.trim();

  if (!term) return [];

  // Se for um ID exato vindo da coleção (ex: "me4-121"), tenta buscar direto
  if (term.includes("-") || (term.length <= 15 && !term.includes(" ") && !term.includes("/"))) {
    try {
      const card = await getCardById(term);
      if (card) return [card];
    } catch (e) {
      // Ignora e continua para a busca normal se falhar
    }
  }

  let query = "";

  // Aceita "199" ou o formato completo "199/165"
  if (/^\d+(\/\d+)?$/.test(term)) {
    const parts = term.split("/");
    if (parts.length === 2) {
      // Pega o número total e converte para inteiro (tira zeros à esquerda: 086 vira 86)
      const total = parseInt(parts[1], 10);
      query = `number:${parts[0]} set.printedTotal:${total}`;
    } else {
      query = `number:${parts[0]}`;
    }
  } else {
    // SÓ REMOVE ASPAS DUPLAS AGORA. Mantém o apóstrofo (') para cartas como AZ's e Boss's!
    const safeTerm = term.replace(/"/g, "");
    query = `name:"${safeTerm}*"`;
  }

  // SÓ ENVIA O HEADER SE A CHAVE EXISTIR (Evita erro de CORS)
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers["X-Api-Key"] = API_KEY;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/cards?q=${encodeURIComponent(query)}&pageSize=250`,
      { headers }
    );

    if (!response.ok) {
      console.warn("Erro na API do Pokémon TCG. Status:", response.status);
      return [];
    }

    const data: SearchResponse = await response.json();
    return data.data;
  } catch (error) {
    // Usamos console.warn no lugar de error para o Next.js não estourar a tela vermelha
    console.warn("Falha ao se conectar com a API:", error);
    return [];
  }
}

interface GetCardResponse {
  data: PokemonCard;
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers["X-Api-Key"] = API_KEY;
  }

  try {
    const response = await fetch(`${BASE_URL}/cards/${id}`, { headers });

    if (!response.ok) {
      return null;
    }

    const data: GetCardResponse = await response.json();
    return data.data;
  } catch (error) {
    // Retorna null silenciosamente se houver falha de rede
    return null;
  }
}