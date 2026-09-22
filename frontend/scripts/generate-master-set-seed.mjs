import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const TCGDEX_ROOT = "https://api.tcgdex.net/v2";
const SERIES = {
  anniversary: {
    seriesId: "me",
    setIds: ["30th", "30th-c"],
    output: "20260919_seed_30th_anniversary_master_sets.sql",
  },
  me: {
    setIds: ["me01", "me02", "me02.5", "me03", "me04", "me05", "mep"],
    output: "20260809_seed_mega_evolution_master_sets.sql",
  },
  sv: {
    setIds: ["sv01", "sv02", "sv03", "sv03.5", "sv04", "sv04.5", "sv05", "sv06", "sv06.5", "sv07", "sv08", "sv08.5", "sv09", "sv10", "sv10.5w", "sv10.5b", "svp", "sve"],
    output: "20260906_seed_scarlet_violet_master_sets.sql",
  },
};
const seriesKey = process.argv[2] ?? "me";
const series = SERIES[seriesKey];
if (!series) throw new Error(`Série inválida: ${seriesKey}. Use uma destas: ${Object.keys(SERIES).join(", ")}`);
const seriesId = series.seriesId ?? seriesKey;
const SET_IDS = series.setIds;
const output = resolve(dirname(fileURLToPath(import.meta.url)), `../supabase/migrations/${series.output}`);

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const escapeSql = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;

function imageUrlForCard(setId, localId) {
  if (setId === "30th-c") return `/cards/30th-c/${localId.padStart(3, "0")}.webp`;
  if (setId !== "sve") {
    return `https://assets.tcgdex.net/en/${seriesId}/${setId}/${localId.padStart(3, "0")}/high.webp`;
  }

  const number = Number(localId);
  return number <= 16
    ? `https://images.pokemontcg.io/sve/${number}_hires.png`
    : `https://pkmncards.com/wp-content/uploads/sve_en_${localId.padStart(3, "0")}_std.png`;
}

function variantsForCard(card, setId) {
  const variants = card.variants ?? {};
  const category = normalize(card.category ?? "");
  const rarity = normalize(card.rarity ?? "");
  if (setId === "me02.5" && category === "pokemon" && ["common", "comum", "uncommon", "incomum", "rare", "rara"].includes(rarity)) {
    return ["normal", "pokeball", "energy"];
  }
  const result = [];
  if (variants.normal) result.push("normal");
  if (variants.reverse) result.push("reverse");
  if (variants.holo) result.push("holo");
  if (variants.firstEdition) result.push("first_edition");
  return result.length ? result : ["normal"];
}

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (response.ok) return response.json();
    } catch {}
  }
  throw new Error(`Falha ao carregar ${url}`);
}

const rows = [];
for (const setId of SET_IDS) {
  const [localizedSet, englishSet] = await Promise.all([
    getJson(`${TCGDEX_ROOT}/pt/sets/${setId}`),
    getJson(`${TCGDEX_ROOT}/en/sets/${setId}`),
  ]);
  const localizedIds = new Set(localizedSet.cards.map((card) => card.id));
  const cards = [...new Map([...englishSet.cards, ...localizedSet.cards].map((card) => [card.id, card])).values()];
  const details = new Array(cards.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: 30 }, async () => {
    while (cursor < cards.length) {
      const index = cursor++;
      const cardId = cards[index].id;
      const preferredLanguage = localizedIds.has(cardId) ? "pt" : "en";
      try {
        details[index] = await getJson(`${TCGDEX_ROOT}/${preferredLanguage}/cards/${cardId}`);
      } catch {
        details[index] = await getJson(`${TCGDEX_ROOT}/en/cards/${cardId}`);
      }
    }
  }));
  details.forEach((card, cardIndex) => variantsForCard(card, setId).forEach((variant, variantIndex) => {
    rows.push([
      setId, card.id, variant, card.localId, card.name,
      imageUrlForCard(setId, card.localId), card.rarity ?? "",
      cardIndex * 10 + variantIndex,
    ]);
  }));
}

const chunks = [];
for (let index = 0; index < rows.length; index += 300) {
  const values = rows.slice(index, index + 300).map((row) => `(${row.slice(0, 7).map(escapeSql).join(",")},${row[7]})`).join(",\n");
  chunks.push(`insert into public.master_set_catalog (set_id, card_id, variant, card_number, card_name, image_url, rarity, sort_order) values\n${values}\non conflict (set_id, card_id, variant) do update set card_number = excluded.card_number, card_name = excluded.card_name, image_url = excluded.image_url, rarity = excluded.rarity, sort_order = excluded.sort_order;`);
}
const anniversaryPrelude = seriesKey === "anniversary"
  ? await readFile(new URL("./sql/allow-anniversary-sets.sql", import.meta.url), "utf8")
  : "";
await writeFile(output, `-- Generated from TCGdex public catalog.\n${anniversaryPrelude ? `begin;\n${anniversaryPrelude}\n` : ""}${chunks.join("\n\n")}\n${anniversaryPrelude ? "commit;\n" : ""}`, "utf8");
if (seriesKey === "anniversary") {
  const dataDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data");
  await mkdir(dataDirectory, { recursive: true });
  const catalogs = Object.fromEntries(SET_IDS.map((setId) => [setId, rows.filter((row) => row[0] === setId).map((row) => ({
    id: `${row[1]}:${row[2]}`, cardId: row[1], variant: row[2], number: row[3],
    name: row[4], image: row[5].replace("/high.webp", "/low.webp"), rarity: row[6],
  }))]));
  await writeFile(resolve(dataDirectory, "anniversary-catalog.json"), `${JSON.stringify(catalogs, null, 2)}\n`, "utf8");
}
process.stdout.write(`Generated ${rows.length} slots at ${output}\n`);
