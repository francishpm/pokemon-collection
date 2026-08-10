"use client";

import { useState } from "react";
import { fetchCardsFromSupabase } from "@/services/collectionService";
import { fetchWishlistFromSupabase } from "@/services/wishlistService";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleExportData = async () => {
    setLoading(true);
    try {
      const [collection, wishlist] = await Promise.all([fetchCardsFromSupabase(), fetchWishlistFromSupabase()]);
      const blob = new Blob([JSON.stringify({ collection, wishlist, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `colecionadex-backup-${new Date().toISOString().split("T")[0]}.json`;
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

  return <div className="space-y-6 max-w-3xl">
    <div><h1 className="text-3xl font-bold">Configurações</h1><p className="text-muted-foreground mt-1">Gerencie seus dados e preferências do ColecionaDex.</p></div>
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4"><div><h2 className="text-lg font-semibold">Backup da Nuvem (JSON)</h2><p className="text-sm text-muted-foreground mt-1">Baixe sua Coleção e Wishlist salvas no Supabase.</p></div><Button disabled={loading} onClick={handleExportData} variant="outline" className="gap-2"><Download size={18} />Exportar Meus Dados (JSON)</Button></div>
  </div>;
}
