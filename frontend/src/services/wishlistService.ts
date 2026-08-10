import { supabase } from "@/lib/supabase";
import { WishlistCard } from "@/types/wishlist-card";
import { PokemonCard } from "@/types/pokemon-card";

interface WishlistRow {
  id: string;
  pokemon_card_id: string;
  created_at: string | null;
  pokemon_data: PokemonCard | null;
}

function toWishlistCard(row: WishlistRow): WishlistCard {
  return {
    id: row.id,
    pokemonCardId: row.pokemon_card_id,
    createdAt: row.created_at ?? new Date().toISOString(),
    pokemonData: row.pokemon_data ?? undefined,
  };
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Your session has expired. Please sign in again.");
  return data.user;
}

export async function fetchWishlistFromSupabase(): Promise<WishlistCard[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("wishlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data as WishlistRow[] | null) ?? []).map(toWishlistCard);
}

export async function saveWishlistItemToSupabase(item: WishlistCard): Promise<WishlistCard> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("wishlist")
    .insert({
      id: item.id,
      user_id: user.id,
      pokemon_card_id: item.pokemonCardId,
      pokemon_data: item.pokemonData ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return toWishlistCard(data as WishlistRow);
}

export async function deleteWishlistItemFromSupabase(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from("wishlist")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function saveWishlistSnapshotToSupabase(id: string, pokemon: PokemonCard): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from("wishlist")
    .update({ pokemon_data: pokemon })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}
