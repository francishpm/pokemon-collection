"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface ScanRegion { left: number; top: number; right: number; bottom: number }
export const DEFAULT_TITLE_REGION: ScanRegion = { left: 8, top: 3, right: 73, bottom: 11 };
export const DEFAULT_NUMBER_REGION: ScanRegion = { left: 3, top: 89, right: 98, bottom: 99 };

interface Props {
  image: string; disabled: boolean;
  title: ScanRegion; number: ScanRegion;
  onTitleChange: (region: ScanRegion) => void;
  onNumberChange: (region: ScanRegion) => void;
}

export function CardScannerRegions({ image, disabled, title, number, onTitleChange, onNumberChange }: Props) {
  const [editing, setEditing] = useState<"title" | "number" | null>(null);
  const active = editing === "number" ? number : title;
  function change(edge: keyof ScanRegion, value: number) {
    const next = { ...active, [edge]: value };
    if (next.right - next.left < 5 || next.bottom - next.top < 2) return;
    (editing === "number" ? onNumberChange : onTitleChange)(next);
  }
  return <div className="space-y-2">
    <div className="relative mx-auto w-full max-w-72 overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="Foto da carta com áreas de leitura" className="block h-auto w-full" />
      {(editing ? [editing] : ["title", "number"]).map((kind) => {
        const region = kind === "title" ? title : number;
        return <div key={kind} className={"pointer-events-none absolute border-2 " + (kind === "title" ? "border-sky-400" : "border-amber-400")} style={{ left: region.left + "%", top: region.top + "%", width: (region.right - region.left) + "%", height: (region.bottom - region.top) + "%" }} />;
      })}
    </div>
    <div className="flex flex-wrap justify-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setEditing(editing === "title" ? null : "title")}>Ajustar nome</Button>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setEditing(editing === "number" ? null : "number")}>Ajustar número</Button>
    </div>
    {editing && <div className="space-y-2 rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">Deixe somente {editing === "title" ? "o nome dentro da área azul, sem estágio ou pontos de vida" : "o número/total dentro da área amarela, sem ataques ou copyright"}. Ajuste os limites abaixo.</p>
      {([ ["left", "Esquerda"], ["right", "Direita"], ["top", "Topo"], ["bottom", "Base"] ] as const).map(([edge, label]) => <label key={edge} className="flex items-center gap-2 text-xs"><span className="w-16">{label}</span><input className="min-w-0 flex-1" type="range" min={0} max={100} step={0.5} value={active[edge]} disabled={disabled} onChange={(e) => change(edge, Number(e.target.value))} /><span className="w-9 text-right">{active[edge]}%</span></label>)}
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Concluir ajuste</Button>
    </div>}
  </div>;
}
