"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ShareSettings {
  token: string;
  enabled: boolean;
}

export function TradeShareButton() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        if (active) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("trade_shares")
        .select("token, enabled")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (error) toast.error("Não foi possível carregar o compartilhamento.");
      if (active) {
        setSettings((data as ShareSettings | null) ?? null);
        setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [open]);

  const saveEnabled = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Sessão expirada");
      const token = settings?.token ?? crypto.randomUUID();
      const { error } = await supabase.from("trade_shares").upsert({
        user_id: authData.user.id,
        token,
        enabled,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSettings({ token, enabled });
      toast.success(enabled ? "Vitrine pública ativada." : "Vitrine pública desativada.");
    } catch (error) {
      console.error("Erro ao configurar compartilhamento de trocas:", error);
      toast.error("Não foi possível alterar o compartilhamento.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!settings?.enabled) return;
    await navigator.clipboard.writeText(`${window.location.origin}/public/trades/${settings.token}`);
    setCopied(true);
    toast.success("Link público copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-400">
        <Share2 size={18} />
        <span className="hidden sm:inline">Compartilhar vitrine</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar trocas</DialogTitle>
            <DialogDescription>O endereço usa um código público aleatório e não revela seu identificador de usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="font-medium">Vitrine pública</p>
                <p className="text-xs text-muted-foreground">{settings?.enabled ? "Ativa para quem tiver o link." : "Desativada por padrão."}</p>
              </div>
              <Button size="sm" variant={settings?.enabled ? "destructive" : "default"} disabled={loading} onClick={() => void saveEnabled(!settings?.enabled)}>
                {loading ? "Aguarde..." : settings?.enabled ? "Desativar" : "Ativar"}
              </Button>
            </div>
            {settings?.enabled && (
              <Button className="w-full gap-2" variant="outline" onClick={() => void copyLink()}>
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {copied ? "Link copiado" : "Copiar link da vitrine"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
