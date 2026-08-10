import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const TCGDEX = "https://api.tcgdex.net/v2/pt";
const SET_IDS = ["me01", "me02", "me02.5", "me03", "me04", "me05", "mep"];
const output = resolve(dirname(fileURLToPath(import.meta.url)), "../supabase/migrations/20260809_seed_mega_evolution_master_sets.sql");

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const escapeSql = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;

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
  const set = await getJson(`${TCGDEX}/sets/${setId}`);
  const details = new Array(set.cards.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: 30 }, async () => {
    while (cursor < set.cards.length) {
      const index = cursor++;
      details[index] = await getJson(`${TCGDEX}/cards/${set.cards[index].id}`);
    }
  }));
  details.forEach((card, cardIndex) => variantsForCard(card, setId).forEach((variant, variantIndex) => {
    rows.push([
      setId, card.id, variant, card.localId, card.name,
      card.image ? `${card.image}/high.webp` : `https://assets.tcgdex.net/en/me/${setId}/${card.localId.padStart(3, "0")}/high.webp`, card.rarity ?? "",
      cardIndex * 10 + variantIndex,
    ]);
  }));
}

const chunks = [];
for (let index = 0; index < rows.length; index += 300) {
  const values = rows.slice(index, index + 300).map((row) => `(${row.slice(0, 7).map(escapeSql).join(",")},${row[7]})`).join(",\n");
  chunks.push(`insert into public.master_set_catalog (set_id, card_id, variant, card_number, card_name, image_url, rarity, sort_order) values\n${values}\non conflict (set_id, card_id, variant) do update set card_number = excluded.card_number, card_name = excluded.card_name, image_url = excluded.image_url, rarity = excluded.rarity, sort_order = excluded.sort_order;`);
}
await writeFile(output, `-- Generated from TCGdex public catalog.\n${chunks.join("\n\n")}\n`, "utf8");
process.stdout.write(`Generated ${rows.length} slots at ${output}\n`);
