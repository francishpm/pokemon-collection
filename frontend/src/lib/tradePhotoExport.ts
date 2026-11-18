import type { TradeView } from "../hooks/useTrades.ts";

export const PHOTO_CARD_COUNTS = [16, 25, 36, 49] as const;

export function splitTradePhotos<T>(cards: T[], count: number) {
  if (!(PHOTO_CARD_COUNTS as readonly number[]).includes(count)) throw new Error("Quantidade de cartas inválida.");
  return Array.from({ length: Math.ceil(cards.length / count) }, (_, index) => cards.slice(index * count, (index + 1) * count));
}

function loadImage(url: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = "anonymous";
    const timeout = window.setTimeout(() => { image.src = ""; reject(new Error("Tempo de carregamento excedido")); }, 20_000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error("Imagem indisponível")); };
    image.src = url;
  });
}

export async function loadCardImage(url: string): Promise<HTMLImageElement> {
  if (!url) throw new Error("Imagem indisponível");
  // Catalogue CDNs support CORS. Avoid requiring the local optimizer to fetch
  // an image the browser can already reach; retain it for hosts without CORS.
  try {
    return await loadImage(url, /^https?:\/\//.test(url));
  } catch {
    // The optimizer can also fail during a transient CDN error. Try the other
    // TCGdex resolution and retry the original before giving up.
    const alternative = /^https:\/\/assets\.tcgdex\.net\//.test(url) && /\/(low|high)\.webp$/.test(url)
      ? url.replace(/\/(low|high)\.webp$/, (_, size: string) => `/${size === "low" ? "high" : "low"}.webp`)
      : null;
    const candidates = [
      { url: `/api/cards/image?${new URLSearchParams({ url })}`, cors: false },
      { url: `/_next/image?${new URLSearchParams({ url, w: "640", q: "75" })}`, cors: false },
      ...(alternative ? [{ url: alternative, cors: true }] : []),
      { url, cors: /^https?:\/\//.test(url) },
    ];
    for (const candidate of candidates) {
      try { return await loadImage(candidate.url, candidate.cors); }
      catch { /* Try the next source; failed attempts never enter the canvas. */ }
    }
    throw new Error("Imagem indisponível após novas tentativas");
  }
}

export function photoDownloadBlob(photo: string): Blob {
  const base64 = photo.split(",")[1];
  if (!photo.startsWith("data:image/jpeg;base64,") || !base64) throw new Error("Foto JPG inválida.");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: "image/jpeg" });
}

export interface PhotoExportCard {
  name: string;
  image: string;
  details: string;
  metadata: string;
  value: string;
  price?: string;
  quantity?: number;
  language?: string;
  overlayValue?: string;
  condition?: string;
}

export function createTradePhotos(cards: TradeView[], count: number, onProgress: (done: number, total: number) => void, showPrices = true) {
  return createCardPhotos(cards.map(({ trade, pokemon }) => ({
    name: pokemon.name,
    image: pokemon.images.small,
    details: `#${pokemon.number}/${pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal} · ${pokemon.set.name}`,
    metadata: [trade.variant_label?.trim(), trade.status === "reserved" ? "Reservada" : trade.status === "completed" ? "Concluída" : ""].filter(Boolean).join(" · "),
    value: "",
    quantity: trade.quantity ?? 1,
    language: trade.language,
    condition: trade.condition,
    overlayValue: showPrices ? (trade.price != null ? trade.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Apenas troca") : "",
  })), count, onProgress, "Cartas para troca e venda", "Consulte a disponibilidade", true, true);
}

export async function createCardPhotos(cards: PhotoExportCard[], count: number, onProgress: (done: number, total: number) => void, heading = "Cartas para troca e venda", subtitle = "Consulte a disponibilidade", allowMissingImages = false, tradeLayout = false) {
  const groups = splitTradePhotos(cards, count);
  const photos: string[] = [];
  let missingImages = 0;
  const missingCards: string[] = [];
  for (const [index, group] of groups.entries()) {
    const columns = Math.sqrt(count);
    const cellWidth = 320;
    const cellHeight = tradeLayout ? 490 : group.some((card) => card.price) ? 560 : 520;
    const padding = 36;
    const canvas = document.createElement("canvas");
    canvas.width = columns * cellWidth + padding * 2;
    canvas.height = Math.ceil(group.length / columns) * cellHeight + (tradeLayout ? 120 : 150);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar a foto.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 36px Arial";
    ctx.fillText(heading, padding, 48, canvas.width - padding * 2);
    ctx.fillStyle = "#64748b";
    ctx.font = "22px Arial";
    ctx.fillText(`Foto ${index + 1}/${groups.length} · ${group.length} cartas · ${subtitle}`, padding, 82, canvas.width - padding * 2);
    // Keep download pressure low even with seven columns per photo.
    const batchSize = 3;
    for (let start = 0; start < group.length; start += batchSize) {
      const row = group.slice(start, start + batchSize);
      const images = await Promise.all(row.map((card) => loadCardImage(card.image).catch(() => null)));
      row.forEach((card, offset) => {
        const position = start + offset;
        const x = padding + (position % columns) * cellWidth;
        const y = 105 + Math.floor(position / columns) * cellHeight;
        ctx.strokeStyle = "#e2e8f0";
        ctx.strokeRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);
        const image = images[offset];
        if (image) {
          const scale = Math.min((tradeLayout ? 296 : 288) / image.naturalWidth, (tradeLayout ? 405 : 365) / image.naturalHeight);
          const width = image.naturalWidth * scale;
          const height = image.naturalHeight * scale;
          ctx.drawImage(image, x + (cellWidth - width) / 2, y + (tradeLayout ? 4 : 12) + ((tradeLayout ? 405 : 365) - height) / 2, width, height);
        } else {
          missingImages++;
          missingCards.push(`${card.name} (${card.details})`);
          ctx.fillStyle = "#64748b";
          ctx.font = "20px Arial";
          ctx.fillText("Imagem indisponível", x + 25, y + 180);
        }
        if ((card.quantity ?? 1) > 1) {
          ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.roundRect(x + 228, y + 18, 65, 34, 12); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font = "bold 22px Arial"; ctx.textAlign = "center";
          ctx.fillText(`${card.quantity}×`, x + 260, y + 43, 58); ctx.textAlign = "left";
        }
        if (card.overlayValue) {
          ctx.font = "bold 26px Arial";
          const badgeWidth = Math.min(275, ctx.measureText(card.overlayValue).width + 24);
          const badgeY = tradeLayout ? 366 : 340;
          ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.roundRect(x + (cellWidth - badgeWidth) / 2, y + badgeY, badgeWidth, 34, 12); ctx.fill();
          ctx.fillStyle = "#111827"; ctx.textAlign = "center";
          ctx.fillText(card.overlayValue, x + cellWidth / 2, y + badgeY + 25, badgeWidth - 12); ctx.textAlign = "left";
        }
        if (card.language && !tradeLayout) drawLanguageFlag(ctx, card.language, x + 16, y + 443, 30, 20);
        const text = (value: string, top: number, font: string, color: string) => {
          ctx.font = font;
          ctx.fillStyle = color;
          let fitted = value;
          while (fitted.length && ctx.measureText(fitted).width > cellWidth - 24) fitted = fitted.slice(0, -1);
          if (fitted !== value) fitted = fitted.slice(0, -1) + "…";
          ctx.textAlign = "center";
          ctx.fillText(fitted, x + cellWidth / 2, y + top);
          ctx.textAlign = "left";
        };
        if (tradeLayout) {
          let left = x + 12;
          if (card.language) { drawLanguageFlag(ctx, card.language, left, y + 415, 30, 20); left += 38; }
          ctx.textAlign = "left"; ctx.font = "bold 21px Arial"; ctx.fillStyle = "#475569";
          if (card.condition) { ctx.fillText(card.condition, left, y + 433); left += ctx.measureText(card.condition).width + 8; }
          ctx.font = "bold 23px Arial"; ctx.fillStyle = "#0f172a";
          let name = card.name;
          const available = x + cellWidth - 12 - left;
          while (name.length && ctx.measureText(name).width > available) name = name.slice(0, -1);
          if (name !== card.name) name = name.slice(0, -1) + "…";
          ctx.fillText(name, left, y + 433, available);
          text([card.details, card.metadata].filter(Boolean).join(" · "), 463, "19px Arial", "#64748b");
        } else {
          text(card.name, 402, "bold 25px Arial", "#0f172a");
          text(card.details, 430, "19px Arial", "#64748b");
          text(card.metadata, 457, "20px Arial", "#475569");
          text(card.value, 492, "bold 29px Arial", "#047857");
          if (card.price) text(card.price, 533, "bold 29px Arial", "#047857");
        }
      });
      onProgress(index * count + Math.min(start + batchSize, group.length), cards.length);
    }
    if (missingImages && !allowMissingImages) throw new Error(`${missingImages} imagem(ns) não carregaram após novas tentativas. A foto não foi gerada para evitar cartas em branco. Clique em Gerar fotos para tentar novamente.`);
    photos.push(canvas.toDataURL("image/jpeg", 0.94));
  }
  return { photos, missingImages, missingCards };
}

function drawLanguageFlag(ctx: CanvasRenderingContext2D, language: string, x: number, y: number, width: number, height: number) {
  ctx.save(); ctx.translate(x, y);
  if (language === "PT") {
    ctx.fillStyle = "#009c3b"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffdf00"; ctx.beginPath(); ctx.moveTo(width / 2, 2); ctx.lineTo(width - 3, height / 2); ctx.lineTo(width / 2, height - 2); ctx.lineTo(3, height / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#002776"; ctx.beginPath(); ctx.arc(width / 2, height / 2, height * 0.23, 0, Math.PI * 2); ctx.fill();
  } else if (language === "EN") {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#b22234"; for (let i = 0; i < 7; i++) ctx.fillRect(0, i * height / 7, width, height / 14);
    ctx.fillStyle = "#3c3b6e"; ctx.fillRect(0, 0, width * 0.42, height * 0.54);
  } else if (language === "JP") {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#bc002d"; ctx.beginPath(); ctx.arc(width / 2, height / 2, height * 0.3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = "#475569"; ctx.font = "bold 16px Arial"; ctx.fillText(language, 0, height - 2);
  }
  ctx.restore();
}
