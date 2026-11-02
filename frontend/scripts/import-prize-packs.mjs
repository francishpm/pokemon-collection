import fs from "node:fs/promises";
import * as cheerio from "cheerio";

const PRODUCT_URL = "https://tcgcsv.com/tcgplayer/3/22880/products";
const CHECKLIST_URL = "https://tcgpromos.com/pokemon-prize-pack-series-cards";
const headers = { "User-Agent": "ColecionaDex/1.0" };
const seriesNames = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const nameKey = (s) => normalize(s.replace(/\([^)]*\)|\[[^\]]*\]/g, "").replace(/\bBasic\b/gi, "").replace(/\b(Growing|Rocky|Telepathic)\s+(?:Grass|Fighting|Psychic)\b/gi, "$1").replace(/\s+(?:VMAX|VSTAR|V|GX|EX)$/i, ""));
const numberKey = (s) => s.replace(/\s/g, "").replace(/^SVP/i, "").toLowerCase().replace(/(^|\/|[a-z])0+(?=\d)/g, "$1");

const [productsResponse, checklistResponse] = await Promise.all([
  fetch(PRODUCT_URL, { headers }), fetch(CHECKLIST_URL, { headers }),
]);
if (!productsResponse.ok || !checklistResponse.ok) throw new Error("Prize Pack sources unavailable");
const products = (await productsResponse.json()).results;
const $ = cheerio.load(await checklistResponse.text());
const checklist = $("table").eq(1).find("tbody tr").map((_, row) => {
  const cells = $(row).find("td").map((__, cell) => $(cell).text().trim()).get();
  if (cells.length !== 4) return null;
  return { name: cells[0], number: cells[1], set: cells[2], series: cells[3].split(/,\s*/).map((s) => seriesNames.indexOf(s) + 1) };
}).get();
if (checklist.length < 700 || products.length < 800) throw new Error("Incomplete source catalogue");

const matched = new Set();
const entries = products.filter((p) => !/^(?:Play! Pokemon Prize Pack|Code Card)/i.test(p.name)).map((p) => {
  const field = (name) => p.extendedData.find((e) => e.name === name)?.value;
  const printed = p.name.match(/MEE\s+\d+/)?.[0] ?? field("Number") ?? "";
  const name = p.name.split(" - ")[0].replace(/\s*\(Prize Pack Series \d+\).*$/i, "");
  const explicitSeries = Number(p.name.match(/Prize Pack Series (\d+)/i)?.[1]);
  const matches = checklist.filter((c) => nameKey(c.name) === nameKey(name) && (
    printed ? numberKey(c.number) === numberKey(printed) : c.number === "No number"
  ));
  matches.forEach((c) => matched.add(c));
  const series = explicitSeries ? [explicitSeries] : [...new Set(matches.flatMap((c) => c.series))].sort((a, b) => a - b);
  const variant = [...p.name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]).filter((v) => !/^Prize Pack/i.test(v)).join(" · ");
  return {
    id: `prize-pack-${p.productId}`, name, number: printed.split("/")[0] || "Sem número",
    total: printed.includes("/") ? printed.split("/")[1] : "∞", series, variant,
    originalSet: matches[0]?.set ?? "", image: p.imageUrl, imageKind: "stamped",
    rarity: field("Rarity") ?? "", type: field("Card Type") ?? "", stage: field("Stage") ?? "", source: p.url,
  };
});

const missing = checklist.filter((c) => !matched.has(c));
for (const c of missing) {
  // Retain checklist-only entries, visibly without artwork, rather than silently
  // dropping them or reusing artwork from an uncertain printing.
  const [number, total] = c.number.split("/");
  entries.push({
    id: `prize-pack-checklist-${normalize(c.name)}-${numberKey(c.number).replace("/", "-")}`,
    name: c.name, number, total: total ?? "∞", series: c.series, variant: "",
    originalSet: c.set, image: "/cards/prize-pack-no-image.svg", imageKind: "unavailable",
    rarity: "", type: "", stage: "", source: CHECKLIST_URL,
  });
}
await fs.writeFile(new URL("../../outputs/prize-audit.json", import.meta.url), JSON.stringify({ missing, unmatchedProducts: entries.filter((e) => !e.series.length).map((e) => ({ name: e.name, number: e.number, total: e.total })) }, null, 2));
await fs.writeFile(new URL("../src/data/prize-packs.json", import.meta.url), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), sources: [PRODUCT_URL, CHECKLIST_URL], checklistCount: checklist.length, cards: entries }, null, 2) + "\n");
console.log(JSON.stringify({ products: entries.length, checklist: checklist.length, matched: matched.size, missing: missing.length, unmatched: entries.filter((e) => !e.series.length).length }));
