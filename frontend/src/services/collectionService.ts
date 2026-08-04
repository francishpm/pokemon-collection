import { CollectionCard } from "@/types/collection-card";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "carddex_collection";

export function getCards(): CollectionCard[] {
  if (typeof window === "undefined") return [];
  const data = window.localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function fetchCardsFromSupabase(): Promise<CollectionCard[]> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("collection")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao buscar cartas do Supabase:", error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    pokemonCardId: row.pokemon_card_id,
    language: row.language,
    condition: row.condition,
    acquisitionValue: row.acquisition_value,
    ligaValue: row.liga_value, // <-- NOVO AQUI
    acquisitionDate: row.acquisition_date,
    notes: row.notes,
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function saveCardToSupabase(card: CollectionCard) {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return;

  await supabase.from("collection").insert({
    id: card.id,
    user_id: user.id,
    pokemon_card_id: card.pokemonCardId,
    language: card.language || "PT",
    condition: card.condition || "NM",
    acquisition_value: card.acquisitionValue || 0,
    liga_value: card.ligaValue || null, // <-- NOVO AQUI
    acquisition_date: card.acquisitionDate || new Date().toISOString(),
    notes: card.notes || "",
  });
}

export async function deleteCardFromSupabase(id: string) {
  await supabase.from("collection").delete().eq("id", id);
}

export async function updateCardInSupabase(card: CollectionCard) {
  await supabase
    .from("collection")
    .update({
      language: card.language,
      condition: card.condition,
      acquisition_value: card.acquisitionValue,
      liga_value: card.ligaValue, // <-- NOVO AQUI
      acquisition_date: card.acquisitionDate,
      notes: card.notes,
    })
    .eq("id", card.id);
}