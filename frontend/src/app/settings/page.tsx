"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWishlistStore } from "@/store/wishlistStore"; 
import { getLegacyLocalCards } from "@/services/collectionService";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, UploadCloud, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Pegando as cartas que estão no armazenamento local
  // Legacy records are only used for the one-time migration screen. The collection itself
  // is now loaded from Supabase, so it cannot overwrite cloud data by accident.
  const localCards = getLegacyLocalCards();
  const localWishlistItems = useWishlistStore((state) => state.items);

  // FUNÇÃO 1: O seu backup original em JSON
  const handleExportData = () => {
    const collectionData = localStorage.getItem("carddex_collection") || "[]";
    const wishlistData = localStorage.getItem("carddex_wishlist") || "[]";

    const fullBackup = {
      collection: JSON.parse(collectionData),
      wishlist: JSON.parse(wishlistData),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carddex-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Backup baixado com sucesso!");
  };

  // FUNÇÃO 2: A nova migração para o Supabase
  const handleMigrate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Você precisa estar logado para enviar os dados!");
        setLoading(false);
        return;
      }

      if (localCards.length > 0) {
        const collectionPayload = localCards.map((card) => ({
          id: card.id,
          user_id: user.id,
          pokemon_card_id: card.pokemonCardId,
          language: card.language || "PT",
          condition: card.condition || "NM",
          acquisition_value: card.acquisitionValue || 0,
          liga_value: card.ligaValue || null,
          acquisition_date: card.acquisitionDate || new Date().toISOString(),
          notes: card.notes || "",
        }));

        const { error: colError } = await supabase.from("collection").upsert(collectionPayload);
        if (colError) throw colError;
      }

      if (localWishlistItems.length > 0) {
        const wishlistPayload = localWishlistItems.map((item) => ({
          id: item.id,
          user_id: user.id,
          pokemon_card_id: item.pokemonCardId,
        }));

        const { error: wishError } = await supabase.from("wishlist").upsert(wishlistPayload);
        if (wishError) throw wishError;
      }

      setSuccess(true);
      toast.success("Dados migrados com sucesso para a nuvem! ☁️");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Erro inesperado durante a migração.";
      toast.error("Erro ao migrar: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seus dados e preferências do CardDex.
        </p>
      </div>

      {/* NOVO CARTÃO: Migração para Nuvem */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Migração de Dados <UploadCloud className="w-5 h-5 text-blue-500" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Encontramos <b>{localCards.length} cartas na sua Coleção</b> e <b>{localWishlistItems.length} na sua Wishlist</b> salvas localmente neste navegador. Envie para o banco de dados.
          </p>
        </div>
        
        <div className="pt-2">
          {success ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200 font-medium">
              <CheckCircle2 className="w-5 h-5" />
              Tudo certo! Suas cartas já estão no banco de dados.
            </div>
          ) : (
            <Button 
              onClick={handleMigrate} 
              disabled={loading || (localCards.length === 0 && localWishlistItems.length === 0)} 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <UploadCloud size={18} />
              {loading ? "Enviando para a Nuvem..." : "Sincronizar com a Nuvem"}
            </Button>
          )}
        </div>
      </div>

      {/* SEU CARTÃO ORIGINAL: Backup JSON */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Backup da Coleção (Arquivo Local)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Faça o download de um arquivo com todas as suas cartas da Coleção e da Wishlist para garantir a segurança dos seus dados.
          </p>
        </div>

        <Button onClick={handleExportData} variant="outline" className="gap-2">
          <Download size={18} />
          Exportar Meus Dados (JSON)
        </Button>
      </div>
    </div>
  );
}
