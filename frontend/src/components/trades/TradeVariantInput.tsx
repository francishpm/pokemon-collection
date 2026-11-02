import { Input } from "@/components/ui/input";
import { TRADE_VARIANT_MAX_LENGTH } from "@/lib/tradeVariant";

export function TradeVariantInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold">Variante (opcional)</label>
    <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={TRADE_VARIANT_MAX_LENGTH} placeholder="Ex.: Pokébola, Master Ball" className="w-52 max-w-full" />
  </div>;
}
