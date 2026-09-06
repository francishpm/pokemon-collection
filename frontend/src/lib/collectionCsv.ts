import type { CollectionCard, CardCondition, CardLanguage } from "@/types/collection-card";
import type { CollectionView } from "@/hooks/useCollection";
import type { PokemonCard } from "@/types/pokemon-card";

const HEADERS = [
  "pokemon_card_id", "nome", "numero", "colecao_id", "colecao", "serie",
  "total_colecao", "total_exibido", "edicao_liga", "imagem_pequena", "imagem_grande",
  "tipo", "subtipos", "raridade", "pokedex", "idioma", "condicao",
  "valor_aquisicao", "data_aquisicao", "valor_mercado", "observacoes",
] as const;

export interface CsvImportRow {
  line: number;
  card?: CollectionCard;
  errors: string[];
}

function escapeFormula(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: unknown) {
  const text = escapeFormula(value == null ? "" : String(value));
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportCollectionCsv(collection: CollectionView[]) {
  const rows = collection.map(({ collection: card, pokemon }) => [
    pokemon.id,
    pokemon.name,
    pokemon.number,
    pokemon.set.id,
    pokemon.set.name,
    pokemon.set.series,
    pokemon.set.printedTotal,
    pokemon.set.printedTotalLabel ?? "",
    pokemon.set.ligaEdition ?? "",
    pokemon.images.small,
    pokemon.images.large,
    pokemon.supertype,
    pokemon.subtypes.join("|"),
    pokemon.rarity ?? "",
    pokemon.nationalPokedexNumbers?.join("|") ?? "",
    card.language,
    card.condition,
    card.acquisitionValue ?? "",
    card.acquisitionDate ?? "",
    card.ligaValue ?? "",
    card.notes ?? "",
  ]);
  return `\uFEFF${[HEADERS, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

function detectDelimiter(text: string) {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  return (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

export function parseCsv(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index++;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function cleanText(value: string | undefined) {
  const text = (value ?? "").trim();
  return /^'[=+\-@]/.test(text) ? text.slice(1) : text;
}

function optionalNumber(value: string | undefined, label: string, errors: string[]) {
  const text = cleanText(value).replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!text) return undefined;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) errors.push(`${label} inválido`);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function parseCollectionCsv(text: string): CsvImportRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => cleanText(header).toLowerCase());
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const value = (row: string[], name: typeof HEADERS[number]) => cleanText(row[indexes.get(name) ?? -1]);

  return rows.slice(1).map((row, index): CsvImportRow => {
    const errors: string[] = [];
    const required = (name: typeof HEADERS[number], label: string) => {
      const result = value(row, name);
      if (!result) errors.push(`${label} ausente`);
      return result;
    };
    const language = value(row, "idioma") as CardLanguage;
    const condition = value(row, "condicao") as CardCondition;
    if (!(["PT", "EN", "JP"] as string[]).includes(language)) errors.push("idioma inválido");
    if (!(["M", "NM", "SP", "MP", "HP", "D"] as string[]).includes(condition)) errors.push("condição inválida");
    const printedTotal = Number(value(row, "total_colecao"));
    if (!Number.isInteger(printedTotal) || printedTotal < 0) errors.push("total da coleção inválido");
    const acquisitionDate = value(row, "data_aquisicao");
    if (acquisitionDate && !/^\d{4}-\d{2}-\d{2}$/.test(acquisitionDate)) errors.push("data deve usar AAAA-MM-DD");

    const pokemon: PokemonCard = {
      id: required("pokemon_card_id", "ID da carta"),
      name: required("nome", "nome"),
      number: required("numero", "número"),
      images: {
        small: required("imagem_pequena", "imagem"),
        large: value(row, "imagem_grande") || value(row, "imagem_pequena"),
      },
      nationalPokedexNumbers: value(row, "pokedex").split("|").filter(Boolean).map(Number).filter(Number.isInteger),
      rarity: value(row, "raridade") || undefined,
      supertype: value(row, "tipo") || "Pokémon",
      subtypes: value(row, "subtipos").split("|").filter(Boolean),
      set: {
        id: required("colecao_id", "ID da coleção"),
        name: required("colecao", "coleção"),
        series: value(row, "serie"),
        printedTotal: Number.isInteger(printedTotal) && printedTotal >= 0 ? printedTotal : 0,
        printedTotalLabel: value(row, "total_exibido") || undefined,
        ligaEdition: value(row, "edicao_liga") || undefined,
      },
    };
    const card: CollectionCard = {
      id: crypto.randomUUID(),
      pokemonCardId: pokemon.id,
      pokemonData: pokemon,
      language,
      condition,
      acquisitionValue: optionalNumber(value(row, "valor_aquisicao"), "valor de aquisição", errors),
      acquisitionDate: acquisitionDate || undefined,
      ligaValue: optionalNumber(value(row, "valor_mercado"), "valor de mercado", errors),
      notes: value(row, "observacoes") || undefined,
      createdAt: new Date().toISOString(),
    };
    return { line: index + 2, card: errors.length ? undefined : card, errors };
  });
}
