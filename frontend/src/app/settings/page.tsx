"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCardsFromSupabase, getLegacyLocalCards } from "@/services/collectionService";
import { fetchWishlistFromSupabase, getLegacyLocalWishlist } from "@/services/wishlistService";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, UploadCloud, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const localCards = getLegacyLocalCards();
  const localWishlistItems = getLegacyLocalWishlist();

  const handleExportData = async () => {
    setLoading(true);
    try {
      const [collection, wishlist] = await Promise.all([fetchCardsFromSupabase(), fetchWishlistFromSupabase()]);
      const blob = new Blob([JSON.stringify({ collection, wishlist, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `carddex-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Backup baixado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o backup da nuvem.");
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logado para importar dados.");
      if (localCards.length) {
        const payload = localCards.map((card) => ({ id: card.id, user_id: user.id, pokemon_card_id: card.pokemonCardId, language: card.language || "PT", condition: card.condition || "NM", acquisition_value: card.acquisitionValue || 0, liga_value: card.ligaValue || null, acquisition_date: card.acquisitionDate || new Date().toISOString(), notes: card.notes || "", pokemon_data: card.pokemonData ?? null }));
        const { error } = await supabase.from("collection").upsert(payload);
        if (error) throw error;
      }
      if (localWishlistItems.length) {
        const payload = localWishlistItems.map((item) => ({ id: item.id, user_id: user.id, pokemon_card_id: item.pokemonCardId, pokemon_data: item.pokemonData ?? null }));
        const { error } = await supabase.from("wishlist").upsert(payload);
        if (error) throw error;
      }
      setSuccess(true);
      toast.success("Dados antigos importados com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar dados.");
    } finally { setLoading(false); }
  };

  return <div className="space-y-6 max-w-3xl">
    <div><h1 className="text-3xl font-bold">Configurações</h1><p className="text-muted-foreground mt-1">Gerencie seus dados e preferências do CardDex.</p></div>
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4"><div><h2 className="text-lg font-semibold flex items-center gap-2">Importar Dados Antigos <UploadCloud className="w-5 h-5 text-blue-500" /></h2><p className="text-sm text-muted-foreground mt-1">Encontramos <b>{localCards.length} cartas</b> e <b>{localWishlistItems.length} itens de Wishlist</b> salvos neste navegador antes da sincronização com a nuvem.</p></div>{success ? <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="w-5 h-5" />Importação concluída.</div> : <Button onClick={handleMigrate} disabled={loading || (!localCards.length && !localWishlistItems.length)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><UploadCloud size={18} />{loading ? "Importando..." : "Importar Dados Antigos"}</Button>}</div>
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4"><div><h2 className="text-lg font-semibold">Backup da Nuvem (JSON)</h2><p className="text-sm text-muted-foreground mt-1">Baixe sua Coleção e Wishlist salvas no Supabase.</p></div><Button disabled={loading} onClick={handleExportData} variant="outline" className="gap-2"><Download size={18} />Exportar Meus Dados (JSON)</Button></div>
  </div>;
}
