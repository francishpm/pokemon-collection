import test from "node:test";
import assert from "node:assert/strict";
import { exportCollectionCsv, parseCollectionCsv, parseCsv } from "../src/lib/collectionCsv.ts";

test("CSV preserva separadores, aspas e quebras de linha", () => {
  const rows = parseCsv('"nome";"observacoes"\r\n"Pikachu";"Comprada; no evento\ncom desconto"');
  assert.deepEqual(rows, [
    ["nome", "observacoes"],
    ["Pikachu", "Comprada; no evento\ncom desconto"],
  ]);
});

test("exporta e importa uma carta mantendo seus dados principais", () => {
  const csv = exportCollectionCsv([{
    collection: {
      id: "physical-1",
      pokemonCardId: "sv1-25",
      language: "PT",
      condition: "NM",
      acquisitionValue: 12.5,
      acquisitionDate: "2026-08-30",
      ligaValue: 20,
      notes: "Presente; com carinho",
      createdAt: "2026-08-30T12:00:00.000Z",
    },
    pokemon: {
      id: "sv1-25",
      name: "Pikachu",
      number: "25",
      images: { small: "https://example.com/small.png", large: "https://example.com/large.png" },
      nationalPokedexNumbers: [25],
      rarity: "Comum",
      supertype: "Pokémon",
      subtypes: ["Básico"],
      set: { id: "sv1", name: "Escarlate e Violeta", series: "SV", printedTotal: 198 },
    },
  }]);

  const [result] = parseCollectionCsv(csv);
  assert.deepEqual(result.errors, []);
  assert.equal(result.card?.pokemonData?.name, "Pikachu");
  assert.equal(result.card?.acquisitionValue, 12.5);
  assert.equal(result.card?.notes, "Presente; com carinho");
  assert.equal(result.card?.pokemonData?.nationalPokedexNumbers?.[0], 25);
});

test("rejeita linha com idioma e condição inválidos", () => {
  const csv = 'pokemon_card_id;nome;numero;colecao_id;colecao;total_colecao;imagem_pequena;idioma;condicao\nsv1-25;Pikachu;25;sv1;SV;198;https://example.com/p.png;XX;PERFEITA';
  const [result] = parseCollectionCsv(csv);
  assert.equal(result.card, undefined);
  assert.match(result.errors.join(" "), /idioma inválido/);
  assert.match(result.errors.join(" "), /condição inválida/);
});
