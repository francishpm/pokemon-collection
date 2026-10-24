import test from "node:test";
import assert from "node:assert/strict";
import { createCardPhotos, loadCardImage, photoDownloadBlob, splitTradePhotos } from "../src/lib/tradePhotoExport.ts";
import type { TradeView } from "../src/hooks/useTrades.ts";

test("photos preserve filtered order and include all cards once", () => {
  const cards = Array.from({ length: 111 }, (_, index) => ({ trade: { id: String(index) } }) as TradeView);
  const photos = splitTradePhotos(cards, 36);
  assert.deepEqual(photos.map((photo) => photo.length), [36, 36, 36, 3]);
  assert.deepEqual(photos.flat(), cards);
  assert.deepEqual(splitTradePhotos(cards, 49).map((photo) => photo.length), [49, 49, 13]);
});

test("empty selections and invalid photo sizes", () => {
  assert.deepEqual(splitTradePhotos([], 25), []);
  assert.throws(() => splitTradePhotos([], 0));
});

test("download creates a JPG file with the original bytes", async () => {
  const bytes = new Uint8Array([255, 216, 255, 224, 0, 1, 255, 217]);
  const photo = `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
  const blob = photoDownloadBlob(photo);
  assert.equal(blob.type, "image/jpeg");
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
  assert.throws(() => photoDownloadBlob("data:,"));
});

test("loads CDN images with CORS and falls back to the optimizer on failure", async (t) => {
  const requests: { url: string; cors: string }[] = [];
  let failDirect = false;
  let failOptimizer = false;
  let failEverything = false;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { setTimeout: globalThis.setTimeout } });
  Object.defineProperty(globalThis, "Image", { configurable: true, value: class {
    crossOrigin = "";
    onload?: () => void;
    onerror?: () => void;
    set src(url: string) {
      requests.push({ url, cors: this.crossOrigin });
      queueMicrotask(() => {
        if (failEverything || (failDirect && url.startsWith("https:") && !url.endsWith("/high.webp")) || (failOptimizer && (url.startsWith("/_next/image") || url.startsWith("/api/cards/image")))) this.onerror?.();
        else this.onload?.();
      });
    }
  } });
  t.after(() => { Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "Image"); });
  const url = "https://assets.tcgdex.net/en/me/30th/027/low.webp";
  await loadCardImage(url);
  assert.deepEqual(requests, [{ url, cors: "anonymous" }]);
  requests.length = 0;
  failDirect = true;
  await loadCardImage(url);
  assert.equal(requests.length, 2);
  assert.ok(requests[1].url.startsWith("/api/cards/image?"));
  assert.equal(requests[1].cors, "");
  requests.length = 0;
  failOptimizer = true;
  await loadCardImage(url);
  assert.equal(requests[3].url, url.replace("/low.webp", "/high.webp"));
  assert.equal(requests[3].cors, "anonymous");
  requests.length = 0;
  failEverything = true;
  await assert.rejects(loadCardImage(url), /novas tentativas/);
  assert.equal(requests.length, 5);
});

test("master set photos render the language, variant and extra quantity", async (t) => {
  const captions: string[] = [];
  const context = {
    fillRect() {}, strokeRect() {}, drawImage() {},
    fillText(value: string) { captions.push(value); },
    measureText(value: string) { return { width: value.length * 5 }; },
  };
  t.mock.method(globalThis, "setTimeout", () => 0 as unknown as ReturnType<typeof setTimeout>);
  Object.defineProperty(globalThis, "window", { configurable: true, value: { setTimeout: globalThis.setTimeout } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => ({ getContext: () => context, toDataURL: () => "data:image/jpeg;base64,test" }) } });
  Object.defineProperty(globalThis, "Image", { configurable: true, value: class {
    naturalWidth = 250; naturalHeight = 350;
    onload?: () => void;
    onerror?: () => void;
    set src(value: string) { queueMicrotask(() => value.includes("missing") ? this.onerror?.() : this.onload?.()); }
  } });
  t.after(() => { Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "document"); Reflect.deleteProperty(globalThis, "Image"); });
  const result = await createCardPhotos([{ name: "Pikachu", image: "/pikachu.webp", price: "R$ 12,50 / un.", details: "023 · Normal", metadata: "Português", value: "3 cópia(s) extra(s)" }], 36, () => {}, "REPETIDAS DISPONÍVEIS", "Pikachus · 30 anos");
  assert.equal(result.photos.length, 1);
  assert.equal(result.missingImages, 0);
  assert.ok(captions.includes("R$ 12,50 / un."));
  for (const caption of ["REPETIDAS DISPONÍVEIS", "Pikachu", "023 · Normal", "Português", "3 cópia(s) extra(s)"]) assert.ok(captions.includes(caption));
  await assert.rejects(createCardPhotos([{ name: "Carta", image: "/missing.webp", details: "001", metadata: "", value: "1 extra" }], 36, () => {}), /evitar cartas em branco/);
});
