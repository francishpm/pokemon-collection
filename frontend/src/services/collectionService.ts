import { CollectionCard } from "@/types/collection-card";
import { supabase } from "@/lib/supabase";
import { PokemonCard } from "@/types/pokemon-card";

interface CollectionRow {
  id: string;
  pokemon_card_id: string;
  language: CollectionCard["language"];
  condition: CollectionCard["condition"];
  acquisition_value: number | null;
  liga_value: number | null;
  liga_lowest_price: number | null;
  liga_price_checked_at: string | null;
  liga_price_url: string | null;
  liga_price_status: CollectionCard["ligaPriceStatus"] | null;
  liga_price_source_trust: CollectionCard["ligaPriceSourceTrust"] | null;
  acquisition_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  pokemon_data: PokemonCard | null;
}

function toCollectionCard(row: CollectionRow): CollectionCard {
  return {
    id: row.id,
    pokemonCardId: row.pokemon_card_id,
    language: row.language,
    condition: row.condition,
    acquisitionValue: row.acquisition_value ?? undefined,
    ligaValue: row.liga_value ?? undefined,
    ligaLowestPrice: row.liga_lowest_price ?? undefined,
    ligaPriceCheckedAt: row.liga_price_checked_at ?? undefined,
    ligaPriceUrl: row.liga_price_url ?? undefined,
    ligaPriceStatus: row.liga_price_status ?? undefined,
    ligaPriceSourceTrust: row.liga_price_source_trust ?? undefined,
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
      liga_lowest_price: card.ligaLowestPrice ?? null,
      liga_price_checked_at: card.ligaPriceCheckedAt ?? null,
      liga_price_url: card.ligaPriceUrl ?? null,
      liga_price_status: card.ligaPriceStatus ?? null,
      liga_price_source_trust: card.ligaPriceSourceTrust ?? null,
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
      liga_lowest_price: card.ligaLowestPrice ?? null,
      liga_price_checked_at: card.ligaPriceCheckedAt ?? null,
      liga_price_url: card.ligaPriceUrl ?? null,
      liga_price_status: card.ligaPriceStatus ?? null,
      liga_price_source_trust: card.ligaPriceSourceTrust ?? null,
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

export interface LigaPriceReferenceUpdate {
  price?: number;
  checkedAt: string;
  url: string;
  status: NonNullable<CollectionCard["ligaPriceStatus"]>;
  sourceTrust?: CollectionCard["ligaPriceSourceTrust"];
}

export async function updateLigaPriceReferenceInSupabase(
  id: string,
  reference: LigaPriceReferenceUpdate,
): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from("collection")
    .update({
      liga_lowest_price: reference.price ?? null,
      liga_price_checked_at: reference.checkedAt,
      liga_price_url: reference.url,
      liga_price_status: reference.status,
      ...(reference.sourceTrust ? { liga_price_source_trust: reference.sourceTrust } : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}
