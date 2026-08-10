import { supabase } from "@/lib/supabase";

interface PokedexRepresentativeRow {
  pokedex_number: number;
  collection_card_id: string;
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sua sessão expirou. Entre novamente.");
  return data.user;
}

export async function fetchPokedexRepresentatives(): Promise<Record<number, string>> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("pokedex_representatives")
    .select("pokedex_number, collection_card_id")
    .eq("user_id", user.id);

  if (error) throw error;

  return ((data as PokedexRepresentativeRow[] | null) ?? []).reduce<Record<number, string>>(
    (representatives, row) => {
      representatives[row.pokedex_number] = row.collection_card_id;
      return representatives;
    },
    {},
  );
}

export async function savePokedexRepresentative(
  pokedexNumber: number,
  collectionCardId: string,
): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from("pokedex_representatives")
    .upsert(
      {
        user_id: user.id,
        pokedex_number: pokedexNumber,
        collection_card_id: collectionCardId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pokedex_number" },
    );

  if (error) throw error;
}
