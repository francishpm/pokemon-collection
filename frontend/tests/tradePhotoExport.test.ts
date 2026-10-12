import test from "node:test";
import assert from "node:assert/strict";
import { createCardPhotos, splitTradePhotos } from "../src/lib/tradePhotoExport.ts";
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
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  } });
  t.after(() => { Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "document"); Reflect.deleteProperty(globalThis, "Image"); });
  const result = await createCardPhotos([{ name: "Pikachu", image: "/pikachu.webp", details: "023 · Normal", metadata: "Português", value: "3 cópia(s) extra(s)" }], 36, () => {}, "REPETIDAS DISPONÍVEIS", "Pikachus · 30 anos");
  assert.equal(result.photos.length, 1);
  assert.equal(result.missingImages, 0);
  for (const caption of ["REPETIDAS DISPONÍVEIS", "Pikachu", "023 · Normal", "Português", "3 cópia(s) extra(s)"]) assert.ok(captions.includes(caption));
});
