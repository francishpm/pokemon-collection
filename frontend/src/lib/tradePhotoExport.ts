import type { TradeView } from "../hooks/useTrades.ts";

export const PHOTO_CARD_COUNTS = [16, 25, 36, 49] as const;

export function splitTradePhotos<T>(cards: T[], count: number) {
  if (!(PHOTO_CARD_COUNTS as readonly number[]).includes(count)) throw new Error("Quantidade de cartas inválida.");
  return Array.from({ length: Math.ceil(cards.length / count) }, (_, index) => cards.slice(index * count, (index + 1) * count));
}

function loadCardImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => { image.src = ""; reject(new Error("Tempo de carregamento excedido")); }, 20_000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error("Imagem indisponível")); };
    // Same-origin image optimizer allows exporting remote catalogue images to canvas.
    image.src = `/_next/image?${new URLSearchParams({ url, w: "640", q: "75" })}`;
  });
}

export interface PhotoExportCard {
  name: string;
  image: string;
  details: string;
  metadata: string;
  value: string;
}

export function createTradePhotos(cards: TradeView[], count: number, onProgress: (done: number, total: number) => void) {
  return createCardPhotos(cards.map(({ trade, pokemon }) => ({
    name: pokemon.name,
    image: pokemon.images.small,
    details: `#${pokemon.number}/${pokemon.set.printedTotalLabel ?? pokemon.set.printedTotal} · ${pokemon.set.name}`,
    metadata: [trade.condition, trade.language, trade.status === "reserved" ? "Reservada" : trade.status === "completed" ? "Concluída" : ""].filter(Boolean).join(" · "),
    value: trade.price != null ? trade.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Apenas troca",
  })), count, onProgress);
}

export async function createCardPhotos(cards: PhotoExportCard[], count: number, onProgress: (done: number, total: number) => void, heading = "Cartas para troca e venda", subtitle = "Consulte a disponibilidade") {
  const groups = splitTradePhotos(cards, count);
  const photos: string[] = [];
  let missingImages = 0;
  for (const [index, group] of groups.entries()) {
    const columns = Math.sqrt(count);
    const cellWidth = 320;
    const cellHeight = 520;
    const padding = 36;
    const canvas = document.createElement("canvas");
    canvas.width = columns * cellWidth + padding * 2;
    canvas.height = Math.ceil(group.length / columns) * cellHeight + 150;
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
    // Limit concurrent image downloads to one row at a time.
    for (let start = 0; start < group.length; start += columns) {
      const row = group.slice(start, start + columns);
      const images = await Promise.all(row.map((card) => loadCardImage(card.image).catch(() => null)));
      row.forEach((card, offset) => {
        const position = start + offset;
        const x = padding + (position % columns) * cellWidth;
        const y = 105 + Math.floor(position / columns) * cellHeight;
        ctx.strokeStyle = "#e2e8f0";
        ctx.strokeRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);
        const image = images[offset];
        if (image) {
          const scale = Math.min(288 / image.naturalWidth, 365 / image.naturalHeight);
          const width = image.naturalWidth * scale;
          const height = image.naturalHeight * scale;
          ctx.drawImage(image, x + (cellWidth - width) / 2, y + 12 + (365 - height) / 2, width, height);
        } else {
          missingImages++;
          ctx.fillStyle = "#64748b";
          ctx.font = "20px Arial";
          ctx.fillText("Imagem indisponível", x + 25, y + 180);
        }
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
        text(card.name, 402, "bold 25px Arial", "#0f172a");
        text(card.details, 430, "19px Arial", "#64748b");
        text(card.metadata, 457, "20px Arial", "#475569");
        text(card.value, 492, "bold 29px Arial", "#047857");
      });
      onProgress(index * count + Math.min(start + columns, group.length), cards.length);
    }
    photos.push(canvas.toDataURL("image/jpeg", 0.94));
  }
  return { photos, missingImages };
}
