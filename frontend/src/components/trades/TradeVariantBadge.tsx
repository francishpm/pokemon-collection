export function TradeVariantBadge({ label }: { label?: string | null }) {
  if (!label?.trim()) return null;
  return <span className="max-w-full break-words rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{label.trim()}</span>;
}
