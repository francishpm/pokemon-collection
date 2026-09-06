"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, DatabaseBackup, Download, Eye, EyeOff, FileSpreadsheet, Lock, Mail, Save, User } from "lucide-react";
import { fetchCardsFromSupabase } from "@/services/collectionService";
import { fetchWishlistFromSupabase } from "@/services/wishlistService";

interface AccountData {
  name: string;
  email: string;
  createdAt: string;
  emailConfirmed: boolean;
}

export default function ProfilePage() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"json" | "csv" | null>(null);

  const downloadFile = (content: BlobPart, type: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportDate = () => new Date().toISOString().split("T")[0];

  const handleJsonExport = async () => {
    setExportingFormat("json");
    try {
      const [collection, wishlist] = await Promise.all([fetchCardsFromSupabase(), fetchWishlistFromSupabase()]);
      downloadFile(
        JSON.stringify({ collection, wishlist, exportedAt: new Date().toISOString() }, null, 2),
        "application/json",
        `colecionadex-backup-${exportDate()}.json`,
      );
      toast.success("Backup baixado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o backup da nuvem.");
    } finally {
      setExportingFormat(null);
    }
  };

  const handleCsvExport = async () => {
    setExportingFormat("csv");
    try {
      const collection = await fetchCardsFromSupabase();
      const csvCell = (value: unknown) => {
        let text = value == null ? "" : String(value);
        if (/^[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replaceAll('"', '""')}"`;
      };
      const sortedCollection = [...collection].sort((a, b) => {
        const pokedexNumberA = a.pokemonData?.nationalPokedexNumbers?.[0];
        const pokedexNumberB = b.pokemonData?.nationalPokedexNumbers?.[0];

        if (pokedexNumberA != null && pokedexNumberB != null && pokedexNumberA !== pokedexNumberB) {
          return pokedexNumberA - pokedexNumberB;
        }
        if (pokedexNumberA != null) return -1;
        if (pokedexNumberB != null) return 1;

        const nameA = a.pokemonData?.name ?? a.pokemonCardId;
        const nameB = b.pokemonData?.name ?? b.pokemonCardId;

        return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base", numeric: true });
      });
      const rows = sortedCollection.map((card) => [
        card.pokemonData?.name ?? card.pokemonCardId,
        card.pokemonData
          ? `${card.pokemonData.number}/${card.pokemonData.set.printedTotalLabel ?? card.pokemonData.set.printedTotal}`
          : "",
        card.ligaPriceUrl,
        card.language,
        card.condition,
        card.acquisitionValue,
        card.ligaValue,
        card.notes,
      ]);
      const header = ["Carta", "Número na coleção", "Link Liga", "Idioma", "Condição", "Valor de aquisição", "Valor atual", "Observações"];
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
      downloadFile(`\uFEFF${csv}`, "text/csv;charset=utf-8", `colecionadex-colecao-${exportDate()}.csv`);
      toast.success("Planilha da coleção baixada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível exportar a coleção.");
    } finally {
      setExportingFormat(null);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast.error("Não foi possível carregar os dados da conta.");
        return;
      }

      const displayName = user.user_metadata?.full_name || "Treinador";
      setAccount({
        name: displayName,
        email: user.email ?? "",
        createdAt: new Date(user.created_at).toLocaleDateString("pt-BR"),
        emailConfirmed: Boolean(user.email_confirmed_at),
      });
      setName(displayName);
    };

    void loadUser();
  }, []);

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Digite um nome para salvar.");
      return;
    }

    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: trimmedName } });
      if (error) throw error;
      setAccount((current) => current ? { ...current, name: trimmedName } : current);
      toast.success("Nome atualizado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível atualizar o nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== passwordConfirmation) {
      toast.error("As senhas não são iguais.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setPasswordConfirmation("");
      toast.success("Senha atualizada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível atualizar a senha. Faça login novamente e tente outra vez.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!account) {
    return <div className="flex h-[70vh] items-center justify-center text-muted-foreground">Carregando conta...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minha Conta</h1>
        <p className="mt-1 text-muted-foreground">Gerencie seus dados e a segurança da sua conta.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-2"><CardContent className="flex items-center gap-4 p-5"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><User size={24} /></div><div><p className="font-semibold">{account.name}</p><p className="text-sm text-muted-foreground">{account.email}</p></div></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">E-mail</p><p className="mt-2 text-sm font-semibold text-foreground">{account.emailConfirmed ? "Verificado" : "Aguardando verificação"}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User size={18} />Dados pessoais</CardTitle><CardDescription>Escolha o nome mostrado no ColecionaDex.</CardDescription></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleNameSubmit}>
              <label className="space-y-2 text-sm font-medium text-foreground"><span>Nome de exibição</span><Input value={name} onChange={(event) => setName(event.target.value)} className="bg-background text-foreground" /></label>
              <label className="space-y-2 text-sm font-medium text-foreground"><span>E-mail</span><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><Input value={account.email} disabled className="bg-muted pl-9 text-muted-foreground" /></div></label>
              <Button type="submit" disabled={savingName || name.trim() === account.name} className="gap-2"><Save size={16} />{savingName ? "Salvando..." : "Salvar nome"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock size={18} />Segurança</CardTitle><CardDescription>Use uma senha forte e exclusiva para sua conta.</CardDescription></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <label className="space-y-2 text-sm font-medium text-foreground"><span>Nova senha</span><div className="relative"><Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} placeholder="Mínimo de 8 caracteres" className="bg-background pr-10 text-foreground" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
              <label className="space-y-2 text-sm font-medium text-foreground"><span>Confirmar nova senha</span><Input type={showPassword ? "text" : "password"} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength={8} className="bg-background text-foreground" /></label>
              <Button type="submit" disabled={savingPassword || !newPassword || !passwordConfirmation} className="gap-2"><Lock size={16} />{savingPassword ? "Atualizando..." : "Atualizar senha"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card><CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground"><CalendarDays size={18} /><span>Conta criada em <strong className="text-foreground">{account.createdAt}</strong>.</span></CardContent></Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DatabaseBackup size={18} />Seus dados</CardTitle>
          <CardDescription>Baixe uma cópia de segurança completa ou uma planilha da sua coleção.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={exportingFormat !== null} onClick={() => void handleJsonExport()} className="flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"><Download size={19} /></span>
            <span><strong className="block text-sm">Backup completo</strong><span className="mt-1 block text-xs text-muted-foreground">Coleção e Wishlist em formato JSON.</span><span className="mt-2 block text-xs font-semibold text-blue-600 dark:text-blue-400">{exportingFormat === "json" ? "Preparando..." : "Baixar JSON"}</span></span>
          </button>
          <button type="button" disabled={exportingFormat !== null} onClick={() => void handleCsvExport()} className="flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><FileSpreadsheet size={19} /></span>
            <span><strong className="block text-sm">Planilha da coleção</strong><span className="mt-1 block text-xs text-muted-foreground">Abra e organize suas cartas no Excel.</span><span className="mt-2 block text-xs font-semibold text-emerald-600 dark:text-emerald-400">{exportingFormat === "csv" ? "Preparando..." : "Baixar CSV"}</span></span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
