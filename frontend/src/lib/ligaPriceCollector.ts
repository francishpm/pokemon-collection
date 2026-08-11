import "server-only";

import * as cheerio from "cheerio";
import sharp from "sharp";

const LIGA_ORIGIN = "https://www.ligapokemon.com.br";
const REQUEST_HEADERS = { "User-Agent": "Mozilla/5.0 ColecionaDex/1.0" };
const LANGUAGE_IDS = { PT: "8", EN: "2", JP: "6" } as const;
const CONDITION_IDS = { M: "1", NM: "2", SP: "3", MP: "4", HP: "5", D: "6" } as const;

// Binary glyphs sampled from Liga's numeric sprite font. The class names and
// sprite positions change on every page, but the rendered digit shapes do not.
const DIGIT_TEMPLATES: Record<string, bigint[]> = {
  "0": [BigInt("0x0000000079b37efdfbb76c78000")],
  "1": [BigInt("0x000000000c79f3e1c3870e1c000")],
  "2": [BigInt("0x0000000079d830e1c71c78fc000")],
  "3": [BigInt("0x0000000079f871c0c1837e78000")],
  "4": [BigInt("0x000000001c78f3e7dbbf0e1c000")],
  "5": [BigInt("0x000000007cc187cec1837678000")],
  "6": [BigInt("0x0000000079db07ced9b37678000")],
  "7": [BigInt("0x00000000fc3861c3061c3870000")],
  "8": [BigInt("0x0000000079fbb7e79db37678000")],
  "9": [BigInt("0x0000000079fb366ecf837678000")],
};

export interface LigaPriceQuery {
  id?: string;
  name: string;
  number: string;
  total: string;
  setName?: string;
  edition?: string;
  language: keyof typeof LANGUAGE_IDS;
  condition: keyof typeof CONDITION_IDS;
}

export interface LigaPriceResult {
  id?: string;
  price?: number;
  checkedAt: string;
  url: string;
  status: "found" | "not_found" | "needs_confirmation" | "error";
  sourceTrust?: "trusted" | "unverified";
  reason?: string;
}

interface LigaStock {
  id: number;
  lj_id: number;
  idioma: string | number;
  qualid: string | number;
  extras: string | number;
  precoFinal?: string | number;
  precoCss?: string;
}

interface LigaStore {
  lj_selo?: string | number;
  lj_fisica?: string | number;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9∞]/g, "");
}

function normalizeNumber(value: string) {
  return normalize(value).replace(/^0+(?=\d)/, "");
}

function parseAssignedArray<T>(script: string, name: string): T[] {
  const match = script.match(new RegExp(`(?:var\\s+)?${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  if (!match) return [];
  try {
    return JSON.parse(match[1]) as T[];
  } catch {
    return [];
  }
}

function parseAssignedObject<T>(script: string, name: string): Record<string, T> {
  const match = script.match(new RegExp(`(?:var\\s+)?${name}\\s*=\\s*(\\{[\\s\\S]*?\\});`));
  if (!match) return {};
  try {
    return JSON.parse(match[1]) as Record<string, T>;
  } catch {
    return {};
  }
}

function buildDirectUrl(query: LigaPriceQuery, edition?: string) {
  const params = new URLSearchParams({
    view: "cards/card",
    card: `${query.name} (${query.number}/${query.total})`,
    num: query.number,
  });
  if (edition) params.set("ed", edition);
  return `${LIGA_ORIGIN}/?${params}`;
}

async function fetchLigaHtml(url: string) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return response.text();
      lastError = new Error(`Liga respondeu HTTP ${response.status}`);
      if (![403, 408, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Falha ao consultar a Liga");
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
  }
  throw lastError ?? new Error("Liga indisponível");
}

function isCardPage(html: string) {
  return /cards_stock\s*=/.test(html);
}

function cardPageMatches(html: string, query: LigaPriceQuery) {
  const $ = cheerio.load(html);
  const title = $("meta[property='og:title']").attr("content") ?? $("title").text();
  const match = title.match(/^(.*?)\s*\(([^/]+)\/([^)]+)\)/);
  return Boolean(
    match
    && normalize(match[1]) === normalize(query.name)
    && normalizeNumber(match[2]) === normalizeNumber(query.number)
    && normalizeNumber(match[3]) === normalizeNumber(query.total)
  );
}

function candidateMatches(href: string, query: LigaPriceQuery) {
  try {
    const url = new URL(href, LIGA_ORIGIN);
    const label = url.searchParams.get("card") ?? "";
    const match = label.match(/^(.*?)\s*\(([^/]+)\/([^)]+)\)$/);
    if (!match) return false;
    if (normalize(match[1]) !== normalize(query.name)) return false;
    if (normalizeNumber(match[2]) !== normalizeNumber(query.number)) return false;
    if (normalizeNumber(match[3]) !== normalizeNumber(query.total)) return false;
    return !query.edition || normalize(url.searchParams.get("ed") ?? "") === normalize(query.edition);
  } catch {
    return false;
  }
}

async function resolveCardPage(query: LigaPriceQuery) {
  const normalizedSetName = query.setName ? normalize(query.setName) : "";
  const inferredEdition = query.edition ?? (
    normalizedSetName.startsWith("edicao")
      ? query.setName?.trim().split(/\s+/).at(-1)
      : undefined
  );
  const directUrl = buildDirectUrl(query, inferredEdition);
  const directHtml = await fetchLigaHtml(directUrl);
  if (isCardPage(directHtml) && cardPageMatches(directHtml, query)) {
    return { html: directHtml, url: directUrl };
  }

  for (const page of [1, 2]) {
    const params = new URLSearchParams({ view: "cards/search", card: query.name });
    if (page > 1) params.set("page", String(page));
    const searchUrl = `${LIGA_ORIGIN}/?${params}`;
    const html = await fetchLigaHtml(searchUrl);
    if (isCardPage(html) && cardPageMatches(html, query)) return { html, url: searchUrl };

    const $ = cheerio.load(html);
    const hrefs = $("a[href*='view=cards/card']").map((_, element) => $(element).attr("href") ?? "").get();
    const href = hrefs.find((value) => candidateMatches(value, query));
    if (href) {
      const url = new URL(href, LIGA_ORIGIN).toString();
      return { html: await fetchLigaHtml(url), url };
    }
  }

  return null;
}

function popcount(value: bigint) {
  let count = 0;
  while (value) {
    value &= value - BigInt(1);
    count++;
  }
  return count;
}

function identifyDigit(mask: bigint) {
  let bestDigit = "";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [digit, templates] of Object.entries(DIGIT_TEMPLATES)) {
    for (const template of templates) {
      const distance = popcount(mask ^ template);
      if (distance < bestDistance) {
        bestDigit = digit;
        bestDistance = distance;
      }
    }
  }
  return bestDigit;
}

async function buildDigitClassMap(css: string, spriteUrl: string) {
  const response = await fetch(spriteUrl, {
    cache: "no-store",
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Imagem numérica da Liga indisponível");

  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const positions = [...css.matchAll(/\.([A-Za-z][A-Za-z0-9]*)\{background-position:(-?\d+)px (-?\d+)px/g)];
  const classes = new Map<string, string>();

  for (const match of positions) {
    const x = Math.abs(Number(match[2]));
    const y = Math.abs(Number(match[3]));
    let mask = BigInt(0);
    for (let row = 0; row < 15; row++) {
      for (let column = 0; column < 7; column++) {
        const offset = ((y + row) * info.width + x + column) * info.channels;
        const isInk = data[offset] - data[offset + 1] > 15;
        mask = (mask << BigInt(1)) | (isInk ? BigInt(1) : BigInt(0));
      }
    }
    classes.set(match[1], identifyDigit(mask));
  }
  return classes;
}

async function decodeProtectedPrice(html: string, priceCss: string) {
  const $ = cheerio.load(html);
  const css = $("style").map((_, element) => $(element).text()).get()
    .find((value) => value.includes("background-position") && value.includes("imgnum"));
  if (!css) throw new Error("CSS numérico não encontrado");
  const spriteMatch = css.match(/background-image:url\(([^)]+)\)/);
  if (!spriteMatch) throw new Error("Imagem numérica não encontrada");
  const spriteUrl = new URL(spriteMatch[1].replace(/["']/g, ""), LIGA_ORIGIN).toString();
  const classes = await buildDigitClassMap(css, spriteUrl);
  const numericText = priceCss.split(";").map((group) => {
    if (group === "V") return ".";
    return group.split(/\s+/).map((className) => classes.get(className)).find(Boolean) ?? "";
  }).join("");
  const price = Number(numericText);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Preço protegido inválido");
  return price;
}

export async function collectLigaPrice(query: LigaPriceQuery): Promise<LigaPriceResult> {
  const checkedAt = new Date().toISOString();
  try {
    const page = await resolveCardPage(query);
    if (!page) return { id: query.id, checkedAt, url: buildDirectUrl(query, query.edition), status: "not_found", reason: "card_not_found" };

    const $ = cheerio.load(page.html);
    const script = $("script").map((_, element) => $(element).text()).get().find((value) => value.includes("cards_stock")) ?? "";
    const stocks = parseAssignedArray<LigaStock>(script, "cards_stock");
    const stores = parseAssignedObject<LigaStore>(script, "cards_stores");
    const eligible = stocks.filter((stock) => {
      if (String(stock.idioma) !== LANGUAGE_IDS[query.language]) return false;
      if (String(stock.qualid) !== CONDITION_IDS[query.condition]) return false;
      // Liga combines extras by multiplying their IDs. Oversize has ID 29,
      // therefore every jumbo listing is divisible by 29.
      return Number(stock.extras) % 29 !== 0;
    });

    if (!eligible.length) return { id: query.id, checkedAt, url: page.url, status: "not_found", reason: "no_compatible_listing" };
    const isTrusted = (stock: LigaStock) => {
      const store = stores[String(stock.lj_id)];
      // Only Liga's verified-store badge counts. A physical storefront alone
      // does not make an offer eligible for the trusted-price preference.
      return Number(store?.lj_selo ?? 0) === 1;
    };
    const selected = eligible.find(isTrusted) ?? eligible[0];
    const price = selected.precoFinal != null
      ? Number(selected.precoFinal)
      : await decodeProtectedPrice(page.html, selected.precoCss ?? "");

    return {
      id: query.id,
      price,
      checkedAt,
      url: page.url,
      status: "found",
      sourceTrust: isTrusted(selected) ? "trusted" : "unverified",
    };
  } catch (error) {
    return {
      id: query.id,
      checkedAt,
      url: buildDirectUrl(query, query.edition),
      status: "error",
      reason: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
