import test from "node:test";
import assert from "node:assert/strict";
import { tradeSaveErrorMessage } from "../src/lib/tradeSaveError.ts";

test("missing quantity columns explain the required database update", () => {
  for (const error of [
    { code: "42703", message: "column trades.quantity does not exist" },
    { code: "PGRST204", message: "Could not find the 'quantity' column of 'trades' in the schema cache" },
  ]) assert.match(tradeSaveErrorMessage(error, "Erro"), /Supabase/);
});

test("unrelated save failures retain their own message", () => {
  for (const error of [null, undefined, { code: "42501", message: "permission denied" }, { code: "42703", message: "column trades.status does not exist" }]) {
    assert.equal(tradeSaveErrorMessage(error, "Erro ao salvar"), "Erro ao salvar");
  }
});

test("missing variant column explains the required database update", () => {
  assert.match(tradeSaveErrorMessage({ code: "PGRST204", message: "Could not find the 'variant_label' column" }, "Erro"), /variante.*Supabase/);
});
