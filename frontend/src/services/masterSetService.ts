import { supabase } from "@/lib/supabase";
import { MASTER_SET_BY_ID, masterSetLogo } from "@/lib/masterSetConfig";
import { MasterSetCatalog, MasterSetProgress, MasterSetVariant } from "@/types/master-set";

export async function fetchMasterSetCatalog(setId: string): Promise<MasterSetCatalog | null> {
  const meta = MASTER_SET_BY_ID.get(setId);
  if (!meta) return null;
  const { data, error } = await supabase.from("master_set_catalog")
    .select("card_id, variant, card_number, card_name, image_url, rarity")
    .eq("set_id", setId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (!data?.length) return null;

  return {
    id: setId,
    name: meta.name,
    logo: masterSetLogo(meta.seriesId, meta),
    totalCards: meta.cards,
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
