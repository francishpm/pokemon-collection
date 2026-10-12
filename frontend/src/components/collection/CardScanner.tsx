"use client";

import { useEffect, useRef, useState } from "react";
import type { Worker } from "tesseract.js";
import { Camera, ImagePlus, Loader2, RotateCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseScannedCard, scannedCardQuery, correctScannedName, selectScannedNumber, type ScannedNumberReading } from "@/lib/cardScanner";

import { CardScannerRegions, DEFAULT_TITLE_REGION, DEFAULT_NUMBER_REGION, type ScanRegion } from "./CardScannerRegions";

interface Props { onSearch: (query: string) => void; onClose: () => void }

function prepareRegion(photo: HTMLImageElement, region: ScanRegion, inverted = false) {
  const canvas = document.createElement("canvas");
  const x = region.left / 100, y = region.top / 100;
  const width = photo.width * (region.right - region.left) / 100;
  const height = photo.height * (region.bottom - region.top) / 100;
  canvas.width = 1200;
  canvas.height = Math.max(1, Math.round(height * canvas.width / width));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Leitura de imagem indisponível.");
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, photo.width * x, photo.height * y, width, height, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray = Math.round(pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114);
    const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.7 + 128));
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = inverted ? 255 - contrast : gray;
  }
  ctx.putImageData(pixels, 0, 0);
  const padded = document.createElement("canvas");
  padded.width = canvas.width + 60; padded.height = canvas.height + 60;
  const paddedContext = padded.getContext("2d");
  if (!paddedContext) throw new Error("Leitura de imagem indisponível.");
  paddedContext.fillStyle = "white"; paddedContext.fillRect(0, 0, padded.width, padded.height);
  paddedContext.drawImage(canvas, 30, 30);
  return padded;
}

export function CardScanner({ onSearch, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const worker = useRef<Worker | null>(null);
  const mounted = useRef(true);
  const operation = useRef(0);
  const locked = useRef(false);
  const [camera, setCamera] = useState(false);
  const [ready, setReady] = useState(false);
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [refineName, setRefineName] = useState(false);
  const [numberSuggestions, setNumberSuggestions] = useState<ScannedNumberReading[]>([]);
  const [titleRegion, setTitleRegion] = useState<ScanRegion>(DEFAULT_TITLE_REGION);
  const [numberRegion, setNumberRegion] = useState<ScanRegion>(DEFAULT_NUMBER_REGION);

  function resetRegions() {
    setNumberSuggestions([]);
    setTitleRegion(DEFAULT_TITLE_REGION); setNumberRegion(DEFAULT_NUMBER_REGION);
  }

  function stopCamera() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }

  useEffect(() => {
    mounted.current = true;
    const operationRef = operation;
    return () => {
      mounted.current = false;
      operationRef.current++;
      stopCamera();
      void worker.current?.terminate().catch(() => undefined);
      worker.current = null;
    };
  }, []);

  useEffect(() => {
    if (camera && video.current && stream.current) {
      video.current.srcObject = stream.current;
    }
  }, [camera]);

  async function startCamera() {
    if (locked.current || starting) return;
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Para abrir a câmera, acesse por HTTPS ou localhost. Você também pode enviar uma foto abaixo.");
      return;
    }
    setStarting(true);
    const id = ++operation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (!mounted.current || id !== operation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stopCamera();
      stream.current = media;
      setImage(""); setReady(false); setCamera(true); setName(""); setNumber(""); setRefineName(false); setStatus("");
    } catch (cause) {
      if (!mounted.current || id !== operation.current) return;
      setError(cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "A câmera não foi autorizada. Permita o acesso no navegador ou envie uma foto."
        : "Não foi possível abrir a câmera. Confira se ela está disponível ou envie uma foto.");
    } finally {
      if (mounted.current && id === operation.current) setStarting(false);
    }
  }

  function capture() {
    const source = video.current;
    if (!source?.videoWidth || !source.videoHeight || !ready) return;
    // Match object-cover in the 3:4 viewport, then crop to the visible guide.
    const scale = Math.max(3 / source.videoWidth, 4 / source.videoHeight);
    const visibleWidth = 3 / scale, visibleHeight = 4 / scale;
    const width = visibleWidth * 0.82, height = width * 88 / 63;
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = Math.round(1200 * 88 / 63);
    canvas.getContext("2d")?.drawImage(source,
      (source.videoWidth - width) / 2, (source.videoHeight - height) / 2,
      width, Math.min(height, visibleHeight), 0, 0, canvas.width, canvas.height);
    resetRegions(); setImage(canvas.toDataURL("image/jpeg", 0.95));
    stopCamera(); setCamera(false); setReady(false); setStatus("");
  }

  async function upload(file?: File) {
    if (!file || locked.current) return;
    setError("");
    if (!/^image\/(jpeg|png|webp|gif|bmp)$/i.test(file.type)) {
      setError("Envie uma foto JPG, PNG ou WebP. Converta fotos HEIC antes de enviar."); return;
    }
    if (file.size > 15 * 1024 * 1024) { setError("Escolha uma foto de até 15 MB."); return; }
    const id = ++operation.current;
    stopCamera(); setCamera(false); setStarting(false);
    const url = URL.createObjectURL(file);
    try {
      const photo = new Image(); photo.src = url; await photo.decode();
      if (!mounted.current || id !== operation.current) return;
      const scale = Math.min(1, 1800 / Math.max(photo.width, photo.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(photo.width * scale));
      canvas.height = Math.max(1, Math.round(photo.height * scale));
      canvas.getContext("2d")?.drawImage(photo, 0, 0, canvas.width, canvas.height);
      resetRegions(); setImage(canvas.toDataURL("image/jpeg", 0.95)); setName(""); setNumber(""); setRefineName(false); setStatus("");
    } catch { if (mounted.current && id === operation.current) setError("Não foi possível ler esta foto. Tente outro arquivo."); }
    finally { URL.revokeObjectURL(url); }
  }

  async function rotate() {
    const photo = new Image(); photo.src = image; await photo.decode();
    if (!mounted.current) return;
    const canvas = document.createElement("canvas"); canvas.width = photo.height; canvas.height = photo.width;
    const ctx = canvas.getContext("2d");
    ctx?.translate(canvas.width, 0); ctx?.rotate(Math.PI / 2); ctx?.drawImage(photo, 0, 0);
    resetRegions(); setImage(canvas.toDataURL("image/jpeg", 0.95)); setName(""); setNumber(""); setRefineName(false); setStatus("");
  }

  async function recognize() {
    if (!image || locked.current) return;
    locked.current = true; setBusy(true); setError("");
    setStatus("Preparando leitura. A primeira vez pode demorar um pouco…");
    const id = ++operation.current;
    let activeWorker: Worker | null = null;
    try {
      const { createWorker, PSM } = await import("tesseract.js");
      activeWorker = await createWorker(["eng", "por"], 1, {
        logger: (message) => {
          if (mounted.current && id === operation.current && message.status === "recognizing text") {
            setStatus(`Lendo a carta… ${Math.round(message.progress * 100)}%`);
          }
        },
      });
      worker.current = activeWorker;
      if (!mounted.current || id !== operation.current) return;
      setName(""); setNumber(""); setNumberSuggestions([]);
      const photo = new Image(); photo.src = image; await photo.decode();
      await activeWorker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
      const titles: { name: string; confidence: number }[] = [];
      const titleRegions = [titleRegion];
      if (titleRegion === DEFAULT_TITLE_REGION) titleRegions.push({ left: 18, top: 3, right: 50, bottom: 9 });
      for (const region of titleRegions) for (const inverted of [false, true]) {
        const result = await activeWorker.recognize(prepareRegion(photo, region, inverted));
        if (!mounted.current || id !== operation.current) return;
        const candidate = parseScannedCard(result.data.text, "").name;
        if (candidate && result.data.confidence >= 40) titles.push({ name: candidate, confidence: result.data.confidence });
      }
      await activeWorker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: "0123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ ",
      });
      const segments: { text: string; confidence: number }[] = [];
      // A good collector number must not inherit the low confidence of nearby flavor text.
      const middle = (numberRegion.left + numberRegion.right) / 2;
      const regions = [numberRegion,
        { ...numberRegion, right: middle },
        { ...numberRegion, left: middle }];
      for (const region of regions) for (const inverted of [false, true]) {
        const result = await activeWorker.recognize(prepareRegion(photo, region, inverted), {}, { blocks: true });
        if (!mounted.current || id !== operation.current) return;
        for (const block of result.data.blocks ?? []) for (const paragraph of block.paragraphs) for (const line of paragraph.lines) {
          segments.push({ text: line.text, confidence: line.confidence });
          for (const word of line.words) segments.push({ text: word.text, confidence: word.confidence });
        }
        // Keep uncertain page-level fragments visible for manual confirmation as a fallback.
        segments.push({ text: result.data.text, confidence: result.data.confidence });
      }
      // Modern cards print the collector number in a short line near the lower left.
      // Exclude the set mark and flavor text, and restrict this extra pass to digits and the separator.
      await activeWorker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: "0123456789/",
      });
      const regionWidth = numberRegion.right - numberRegion.left;
      const regionHeight = numberRegion.bottom - numberRegion.top;
      const collectorRegion = {
        left: numberRegion.left + regionWidth * 0.1,
        right: numberRegion.left + regionWidth * 0.43,
        top: numberRegion.top + regionHeight * 0.35,
        bottom: numberRegion.top + regionHeight * 0.88,
      };
      for (const inverted of [false, true]) {
        const result = await activeWorker.recognize(prepareRegion(photo, collectorRegion, inverted));
        if (!mounted.current || id !== operation.current) return;
        segments.push({ text: result.data.text, confidence: result.data.confidence });
      }
      const selection = selectScannedNumber(segments);
      setNumberSuggestions(selection.candidates);
      let readName = titles.sort((a, b) => b.confidence - a.confidence)[0]?.name ?? "";
      const readNumber = selection.number;
      if (readName) {
        try {
          const response = await fetch("/api/pokemon/species-list", { signal: AbortSignal.timeout(6000) });
          if (response.ok) {
            const catalog = await response.json() as { species?: { name: string }[] };
            readName = correctScannedName(readName, (catalog.species ?? []).map((item) => item.name));
          }
        } catch { /* Suggestions remain editable when the catalog is unavailable. */ }
      }
      if (!mounted.current || id !== operation.current) return;
      setName(readName); setNumber(readNumber); setRefineName(false);
      setStatus(readNumber
        ? "Número sugerido. Confira com a foto antes de pesquisar."
        : readName ? "Nome sugerido, mas o número não foi lido com segurança. Ajuste a área amarela ou preencha o número."
        : "Leitura incerta. Ajuste as áreas do nome e do número ou preencha os campos manualmente.");
      if (!readNumber && selection.candidates.length) setStatus("O número foi lido com dúvida. Compare as possibilidades abaixo com a carta e escolha a correta.");
      if (Math.min(photo.width, photo.height) < 600) {
        setStatus((current) => current + " A foto tem pouca resolução; uma foto mais próxima e nítida pode ajudar.");
      }
    } catch {
      if (mounted.current && id === operation.current) {
        setError("Não foi possível concluir a leitura. Confira sua conexão e tente novamente, ou preencha os campos abaixo.");
        setStatus("");
      }
    } finally {
      await activeWorker?.terminate().catch(() => undefined);
      if (worker.current === activeWorker) worker.current = null;
      locked.current = false;
      if (mounted.current && id === operation.current) setBusy(false);
    }
  }

  function search() {
    try { onSearch(scannedCardQuery(number.trim() && !refineName ? "" : name, number)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Confira os campos."); }
  }

  return (
    <section className="space-y-3" aria-label="Scanner de cartas">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Escanear uma carta</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}><X /> Fechar</Button>
      </div>
      <p className="text-xs text-muted-foreground">Enquadre uma carta inteira, na vertical, com boa luz e sem reflexos. Na foto enviada, deixe pouca margem ao redor da carta.</p>
      {camera && (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-72 overflow-hidden rounded-xl bg-black">
          <video ref={video} autoPlay playsInline muted onLoadedData={() => setReady(true)} className="h-full w-full object-cover" aria-label="Prévia da câmera" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-[63/88] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white shadow-[0_0_0_100px_rgba(0,0,0,0.4)]" />
          <Button type="button" className="absolute bottom-3 left-1/2 -translate-x-1/2" disabled={!ready} onClick={capture}><Camera /> Capturar carta</Button>
        </div>
      )}
      {image && (
        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <CardScannerRegions image={image} disabled={busy} title={titleRegion} number={numberRegion}
            onTitleChange={(region) => { setTitleRegion(region); setName(""); setStatus("Área alterada. Clique em Ler carta novamente."); }}
            onNumberChange={(region) => { setNumberRegion(region); setNumber(""); setNumberSuggestions([]); setStatus("Área alterada. Clique em Ler carta novamente."); }} />
          <div className="flex justify-center gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void rotate()}><RotateCw /> Girar</Button>
            <Button type="button" disabled={busy} onClick={() => void recognize()}>{busy ? <Loader2 className="animate-spin" /> : <Search />}{busy ? "Lendo…" : "Ler carta"}</Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy || starting || camera} onClick={() => void startCamera()}><Camera />{starting ? "Abrindo…" : "Abrir câmera"}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><ImagePlus /> Enviar foto</Button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" className="hidden" aria-label="Enviar foto da carta" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file); }} />
      </div>
      <p className="text-xs text-muted-foreground">A foto é lida neste dispositivo. A primeira leitura precisa de internet para baixar os recursos de reconhecimento.</p>
      {status && <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{status}</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="space-y-2">
        <label className="block space-y-1 text-xs font-medium">Nome da carta<Input value={name} disabled={busy} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pikachu" /></label>
        <label className="block space-y-1 text-xs font-medium">Número / total<Input value={number} disabled={busy} onChange={(e) => setNumber(e.target.value)} placeholder="Ex.: 025/165" /></label>
        {numberSuggestions.length > 0 && !number.trim() && <div className="space-y-1">
          <p className="text-xs text-amber-600 dark:text-amber-400">Possíveis números — confira na carta antes de escolher:</p>
          <div className="flex flex-wrap gap-2">{numberSuggestions.map((candidate) => <Button key={candidate.number} type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setNumber(candidate.number); setError(""); setStatus("Número escolhido por você. Confira a carta nos resultados."); }}>{candidate.number}</Button>)}</div>
        </div>}
        {number.trim() && <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={refineName} disabled={busy} onChange={(e) => setRefineName(e.target.checked)} /> Usar também o nome para refinar a busca</label>}
        <Button type="button" className="w-full" disabled={busy || (!name.trim() && !number.trim())} onClick={search}><Search /> Buscar correspondências</Button>
        <p className="text-xs text-muted-foreground">Confirme a imagem e a edição nos resultados. O scanner não identifica brilho ou estado de conservação.</p>
      </div>
    </section>
  );
}
