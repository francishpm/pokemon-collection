import { CollectionCard } from "@/types/collection-card";
import { supabase } from "@/lib/supabase";
import { PokemonCard } from "@/types/pokemon-card";

const LEGACY_STORAGE_KEY = "carddex_collection";

interface CollectionRow {
  id: string;
  pokemon_card_id: string;
  language: CollectionCard["language"];
  condition: CollectionCard["condition"];
  acquisition_value: number | null;
  liga_value: number | null;
  acquisition_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  pokemon_data: PokemonCard | null;
}

export function getLegacyLocalCards(): CollectionCard[] {
  if (typeof window === "undefined") return [];

  try {
    const rawCards = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return rawCards ? JSON.parse(rawCards) : [];
  } catch {
    return [];
  }
}

function toCollectionCard(row: CollectionRow): CollectionCard {
  return {
    id: row.id,
    pokemonCardId: row.pokemon_card_id,
    language: row.language,
    condition: row.condition,
    acquisitionValue: row.acquisition_value ?? undefined,
    ligaValue: row.liga_value ?? undefined,
    acquisitionDate: row.acquisition_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? undefined,
    pokemonData: row.pokemon_data ?? undefined,
  };
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Your session has expired. Please sign in again.");
  return data.user;
}

export async function fetchCardsFromSupabase(): Promise<CollectionCard[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("collection")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data as CollectionRow[] | null) ?? []).map(toCollectionCard);
}

export async function saveCardToSupabase(card: CollectionCard): Promise<CollectionCard> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("collection")
    .insert({
      id: card.id,
      user_id: user.id,
      pokemon_card_id: card.pokemonCardId,
      language: card.language,
      condition: card.condition,
      acquisition_value: card.acquisitionValue ?? null,
      liga_value: card.ligaValue ?? null,
      acquisition_date: card.acquisitionDate ?? null,
      notes: card.notes ?? null,
      pokemon_data: card.pokemonData ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return toCollectionCard(data as CollectionRow);
}

export async function deleteCardFromSupabase(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from("collection")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function updateCardInSupabase(card: CollectionCard): Promise<CollectionCard> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("collection")
    .update({
      language: card.language,
      condition: card.condition,
      acquisition_value: card.acquisitionValue ?? null,
      liga_value: card.ligaValue ?? null,
      acquisition_date: card.acquisitionDate ?? null,
      notes: card.notes ?? null,
      pokemon_data: card.pokemonData ?? null,
    })
    .eq("id", card.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return toCollectionCard(data as CollectionRow);
}

export async function savePokemonSnapshotToSupabase(id: string, pokemon: PokemonCard): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from("collection")
    .update({ pokemon_data: pokemon })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}
