import { supabase } from "@/lib/supabase";
import { MasterSetCatalog, MasterSetProgress, MasterSetVariant } from "@/types/master-set";

const SET_META: Record<string, { name: string; logo: string; totalCards: number }> = {
  me01: { name: "Megaevolução", logo: "https://assets.tcgdex.net/pt/me/me01/logo.webp", totalCards: 188 },
  me02: { name: "Chamas Fantasmagóricas", logo: "https://assets.tcgdex.net/pt/me/me02/logo.webp", totalCards: 130 },
  "me02.5": { name: "Heróis Ascendentes", logo: "https://assets.tcgdex.net/pt/me/me02.5/logo.webp", totalCards: 295 },
  me03: { name: "Ordem Perfeita", logo: "https://assets.tcgdex.net/pt/me/me03/logo.webp", totalCards: 124 },
  me04: { name: "Ascensão do Caos", logo: "https://assets.tcgdex.net/pt/me/me04/logo.webp", totalCards: 122 },
  me05: { name: "Pitch Black", logo: "https://assets.tcgdex.net/en/me/me05/logo.png", totalCards: 120 },
};

export async function fetchMasterSetCatalog(setId: string): Promise<MasterSetCatalog | null> {
  const meta = SET_META[setId];
  if (!meta) return null;
  const { data, error } = await supabase.from("master_set_catalog")
    .select("card_id, variant, card_number, card_name, image_url, rarity")
    .eq("set_id", setId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (!data?.length) return null;

  return {
    id: setId,
    ...meta,
    slots: data.map((row) => ({
      id: `${row.card_id}:${row.variant}`,
      cardId: row.card_id,
      number: row.card_number,
      name: row.card_name,
      image: row.image_url.replace("/high.webp", "/low.webp"),
      rarity: row.rarity ?? undefined,
      variant: row.variant as MasterSetVariant,
    })),
  };
}

export async function fetchMasterSetProgress(setId: string): Promise<MasterSetProgress[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sua sessão expirou.");

  const { data, error } = await supabase
    .from("master_set_progress")
    .select("card_id, variant, quantity")
    .eq("user_id", authData.user.id)
    .eq("set_id", setId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    slotId: `${row.card_id}:${row.variant}`,
    quantity: row.quantity,
  }));
}

export async function saveMasterSetQuantity(setId: string, cardId: string, variant: string, quantity: number) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sua sessão expirou.");

  if (quantity <= 0) {
    const { error } = await supabase.from("master_set_progress").delete()
      .eq("user_id", authData.user.id).eq("set_id", setId).eq("card_id", cardId).eq("variant", variant);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("master_set_progress").upsert({
    user_id: authData.user.id,
    set_id: setId,
    card_id: cardId,
    variant,
    quantity,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,set_id,card_id,variant" });
  if (error) throw error;
}
