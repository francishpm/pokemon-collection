"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CollectionView } from "@/hooks/useCollection";
import { exportCollectionCsv, parseCollectionCsv } from "@/lib/collectionCsv";
import type { CsvImportRow } from "@/lib/collectionCsv";
import { useCollectionStore } from "@/store/collectionStore";

interface Props {
  collectionView: CollectionView[];
}

function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function CollectionCsvActions({ collectionView }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const addCards = useCollectionStore((state) => state.addCards);

  const invalidRows = rows.filter((row) => row.errors.length > 0);
  const validCards = rows.flatMap((row) => row.card ? [row.card] : []);

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(exportCollectionCsv(collectionView), `colecionadex-${date}.csv`);
    toast.success(`${collectionView.length} carta(s) exportada(s).`);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Selecione um arquivo CSV.");
      return;
    }
    if (file.size > 5_000_000) {
      toast.error("O arquivo deve ter no máximo 5 MB.");
      return;
    }
    try {
      const parsedRows = parseCollectionCsv(await file.text());
      if (parsedRows.length > 1000) {
        toast.error("Importe no máximo 1.000 cartas por arquivo.");
        return;
      }
      setFilename(file.name);
      setRows(parsedRows);
      setOpen(true);
    } catch {
      toast.error("Não foi possível ler o arquivo CSV.");
    }
  };

  const handleImport = async () => {
    if (!validCards.length || invalidRows.length) return;
    setImporting(true);
    try {
      const imported = await addCards(validCards);
      toast.success(`${imported} carta(s) importada(s) com sucesso.`);
      setOpen(false);
      setRows([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar as cartas.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2" onClick={() => inputRef.current?.click()}>
          <Upload size={17} />
          <span className="hidden xl:inline">Importar CSV</span>
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!collectionView.length}>
          <Download size={17} />
          <span className="hidden xl:inline">Exportar CSV</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => !importing && setOpen(next)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet size={19} />Importar coleção</DialogTitle>
            <DialogDescription>
              Confira a prévia de {filename}. Cada linha será adicionada como uma nova carta física.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Linhas</p><p className="text-xl font-bold">{rows.length}</p></div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"><p className="text-xs text-muted-foreground">Válidas</p><p className="text-xl font-bold text-emerald-600">{validCards.length}</p></div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3"><p className="text-xs text-muted-foreground">Com erro</p><p className="text-xl font-bold text-red-600">{invalidRows.length}</p></div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">O arquivo não possui linhas para importar.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-muted"><tr><th className="p-2">Linha</th><th className="p-2">Carta</th><th className="p-2">Coleção</th><th className="p-2">Idioma</th><th className="p-2">Condição</th><th className="p-2">Situação</th></tr></thead>
                <tbody>
                  {rows.slice(0, 10).map((row) => (
                    <tr key={row.line} className="border-t">
                      <td className="p-2">{row.line}</td>
                      <td className="p-2 font-medium">{row.card?.pokemonData?.name ?? "-"}</td>
                      <td className="p-2">{row.card?.pokemonData?.set.name ?? "-"}</td>
                      <td className="p-2">{row.card?.language ?? "-"}</td>
                      <td className="p-2">{row.card?.condition ?? "-"}</td>
                      <td className={`p-2 ${row.errors.length ? "text-red-600" : "text-emerald-600"}`}>
                        {row.errors.length ? row.errors.join(", ") : "Pronta para importar"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && <p className="border-t p-2 text-center text-xs text-muted-foreground">Mais {rows.length - 10} linha(s) não exibida(s) na prévia.</p>}
            </div>
          )}

          {invalidRows.length > 0 && (
            <p className="text-sm text-red-600">Corrija as linhas indicadas no CSV. Nenhuma carta será importada enquanto houver erros.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>Cancelar</Button>
            <Button onClick={() => void handleImport()} disabled={importing || !validCards.length || invalidRows.length > 0} className="gap-2">
              {importing && <Loader2 size={16} className="animate-spin" />}
              {importing ? "Importando..." : `Importar ${validCards.length} carta(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
