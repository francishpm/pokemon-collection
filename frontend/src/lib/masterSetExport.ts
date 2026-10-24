import type { MasterSetSlot, MasterSetVariant } from "@/types/master-set";
import { createCardPhotos, photoDownloadBlob, PHOTO_CARD_COUNTS } from "./tradePhotoExport";
import { duplicatePriceLabel } from "./duplicatePrices";

export const MASTER_SET_VARIANT_LABELS: Record<MasterSetVariant, string> = {
  normal: "Normal", reverse: "Reverse Holofoil", holo: "Holofoil",
  energy: "Energia", pokeball: "Pokébola", first_edition: "1ª edição",
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]!));

export function openMissingCardsPrint(name: string, slots: MasterSetSlot[], languageLabel?: string) {
  return openCardsPrint(name, slots, { languageLabel });
}

export function openDuplicateCardsPrint(name: string, slots: MasterSetSlot[], languageLabel: string, quantities: Record<string, number>, prices?: Record<string, number | null>) {
  return openCardsPrint(name, slots, { languageLabel, duplicates: quantities, prices });
}

function openCardsPrint(name: string, slots: MasterSetSlot[], options: { languageLabel?: string; duplicates?: Record<string, number>; prices?: Record<string, number | null> }) {
  const { languageLabel, duplicates, prices } = options;
  const heading = duplicates ? "REPETIDAS DISPONÍVEIS" : "PROCURO";
  const description = duplicates
    ? `${slots.reduce((total, slot) => total + (duplicates[slot.id] ?? 0), 0)} cópia(s) extra(s) · ${slots.length} carta(s) diferente(s) · Quem tiver interesse, me chama!`
    : `${slots.length} versão(ões) faltante(s) · Quem tiver, me chama!`;
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Permita abrir a nova janela para exportar sua lista.");
  popup.opener = null;
  const cards = slots.map((slot) => {
    let image = "";
    try {
      const url = new URL(slot.image, window.location.origin);
      if (slot.image && ["http:", "https:"].includes(url.protocol)) image = url.href;
    } catch { /* Cards without a usable image keep their identifying caption. */ }
    return `<article>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(slot.name)}">` : '<div class="placeholder">Imagem indisponível</div>'}<strong>${escapeHtml(slot.name)}</strong><span>${escapeHtml(slot.number)} · ${escapeHtml(MASTER_SET_VARIANT_LABELS[slot.variant])}${languageLabel ? ` · ${escapeHtml(languageLabel)}` : ""}</span>${duplicates ? `<span>${duplicates[slot.id] ?? 0} cópia(s) extra(s)</span>` : ""}${prices && duplicatePriceLabel(prices[slot.id]) ? `<strong>${escapeHtml(duplicatePriceLabel(prices[slot.id]))}</strong>` : ""}</article>`;
  }).join("");
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} — ${escapeHtml(name)}</title><style>
    *{box-sizing:border-box}body{margin:0;background:#fff;color:#172033;font-family:Arial,sans-serif}.controls{padding:16px;background:#eef2ff;text-align:center}.controls button{padding:12px 20px;border:0;border-radius:8px;background:#2458d3;color:white;font-weight:bold;cursor:pointer}.controls button:disabled{opacity:.5}main{max-width:1000px;margin:auto;padding:24px}h1{font-size:32px;margin:0 0 8px}h2{font-size:20px;margin:0 0 8px}p{color:#465268}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px 12px;margin-top:24px}article{break-inside:avoid;text-align:center;min-width:0}img,.placeholder{width:100%;aspect-ratio:2.5/3.5;object-fit:contain;border-radius:8px}.placeholder{display:grid;place-items:center;background:#eee}strong,span{display:block;margin-top:5px}strong{font-size:13px}span{font-size:11px;color:#465268}@page{size:A4;margin:12mm}@media print{.controls{display:none}main{padding:0}.cards{gap:14px 10px}h1{font-size:26px}}@media screen and (max-width:500px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .photo-controls{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px}.photo-controls select{padding:10px;border:1px solid #b7c4dd;border-radius:8px;background:white}.photo-results{max-width:1000px;margin:20px auto;text-align:left}.photo-results img{width:100%;height:auto;aspect-ratio:auto}.photo-results a{display:inline-block;margin:12px 0;padding:10px 16px;border-radius:8px;background:#2458d3;color:white;text-decoration:none}.photo-results article{margin-bottom:20px}.photo-status{color:#465268}
    </style></head><body><div class="controls"><button id="print" disabled>Carregando imagens...</button><p>Escolha “Salvar como PDF” na janela de impressão ou gere fotos JPG para enviar aos grupos.</p><p id="image-status" role="status"></p><div class="photo-controls"><label>Cartas por foto <select id="photo-count">${PHOTO_CARD_COUNTS.map((count) => `<option value="${count}" ${count === 36 ? "selected" : ""}>${count} (${Math.sqrt(count)}×${Math.sqrt(count)})</option>`).join("")}</select></label><button id="generate-photos">Gerar fotos</button></div><p id="photo-status" role="status"></p><div id="photo-results" class="photo-results"></div></div><main><h1>${heading}</h1><h2>${escapeHtml(name)}</h2><p>${escapeHtml(description)}</p><div class="cards">${cards}</div></main></body></html>`);
  popup.document.close();
  const button = popup.document.getElementById("print") as HTMLButtonElement;
  button.addEventListener("click", () => popup.print());
  const photoButton = popup.document.getElementById("generate-photos") as HTMLButtonElement;
  const photoCount = popup.document.getElementById("photo-count") as HTMLSelectElement;
  const photoStatus = popup.document.getElementById("photo-status")!;
  const photoResults = popup.document.getElementById("photo-results")!;
  const photoUrls: string[] = [];
  const clearPhotos = () => {
    photoResults.replaceChildren();
    photoUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  };
  popup.addEventListener("pagehide", clearPhotos);
  photoCount.addEventListener("change", () => { clearPhotos(); photoStatus.textContent = ""; });
  photoButton.addEventListener("click", async () => {
    photoButton.disabled = true;
    photoCount.disabled = true;
    clearPhotos();
    photoStatus.textContent = "Preparando fotos...";
    try {
      const result = await createCardPhotos(slots.map((slot) => ({
        name: slot.name,
        image: slot.image,
        details: `${slot.number} · ${MASTER_SET_VARIANT_LABELS[slot.variant]}`,
        metadata: languageLabel ?? "",
        price: duplicatePriceLabel(prices?.[slot.id]),
        value: duplicates ? `${duplicates[slot.id] ?? 0} cópia(s) extra(s)` : "Procuro esta carta",
      })), Number(photoCount.value), (done, total) => {
        if (!popup.closed) photoStatus.textContent = `Preparando ${done}/${total} cartas...`;
      }, heading, name);
      if (popup.closed) return;
      photoStatus.textContent = `${result.photos.length} foto(s) pronta(s).${result.missingImages ? ` ${result.missingImages} imagem(ns) não carregaram. Confira ou gere novamente.` : " Baixe cada foto abaixo."}`;
      for (const [index, photo] of result.photos.entries()) {
        const article = popup.document.createElement("article");
        const link = popup.document.createElement("a");
        const photoUrl = URL.createObjectURL(photoDownloadBlob(photo));
        photoUrls.push(photoUrl);
        link.href = photoUrl;
        link.download = `master-set-${duplicates ? "repetidas" : "faltantes"}-${index + 1}.jpg`;
        link.textContent = `Salvar foto ${index + 1}`;
        const image = popup.document.createElement("img");
        image.src = photoUrl;
        image.alt = `Foto ${index + 1} — ${name}`;
        article.append(link, image);
        photoResults.append(article);
      }
    } catch (error) {
      if (!popup.closed) photoStatus.textContent = error instanceof Error ? error.message : "Não foi possível gerar as fotos. Tente novamente.";
    } finally {
      if (!popup.closed) { photoButton.disabled = false; photoCount.disabled = false; }
    }
  });
  void Promise.all(Array.from(popup.document.images).map((img) => new Promise<void>((resolve) => {
    const finish = () => { clearTimeout(timeout); resolve(); };
    const timeout = setTimeout(finish, 15000);
    if (img.complete) finish();
    else { img.onload = finish; img.onerror = finish; }
  }))).then(() => {
    if (popup.closed) return;
    button.disabled = false;
    button.textContent = "Imprimir / Salvar PDF";
    const missing = Array.from(popup.document.images).filter((img) => !img.complete || !img.naturalWidth).length;
    if (missing) popup.document.getElementById("image-status")!.textContent = `${missing} imagem(ns) não carregou(aram). Você pode aguardar ou exportar com os nomes e números.`;
  });
}
