export function tradeSaveErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) return fallback;
  const { code, message } = error as { code?: string; message?: string };
  if ((code === "42703" || code === "PGRST204") && /variant_label/i.test(message ?? "")) {
    return "Falta atualizar o banco para salvar a variante. Execute a migração de variante no Supabase e tente novamente.";
  }
  if ((code === "42703" || code === "PGRST204") && /quantity/i.test(message ?? "")) {
    return "O banco ainda não foi atualizado para salvar quantidades. Aplique a atualização de quantidade no Supabase e tente novamente.";
  }
  return fallback;
}
