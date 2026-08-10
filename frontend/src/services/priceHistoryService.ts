import { supabase } from "@/lib/supabase";
import { PriceHistory } from "@/types/price.history";

interface PriceHistoryRow {
  id: string;
  collection_card_id: string;
  price: number | string;
  created_at: string;
  source: PriceHistory["source"];
  source_trust: PriceHistory["sourceTrust"] | null;
}

export async function fetchPriceHistory(): Promise<PriceHistory[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sua sessão expirou.");

  const { data, error } = await supabase
    .from("price_history")
    .select("id, collection_card_id, price, created_at, source, source_trust")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data as PriceHistoryRow[] | null) ?? []).map((row) => ({
    id: row.id,
    collectionCardId: row.collection_card_id,
    price: Number(row.price),
    createdAt: row.created_at,
    source: row.source,
    sourceTrust: row.source_trust ?? undefined,
  }));
}
