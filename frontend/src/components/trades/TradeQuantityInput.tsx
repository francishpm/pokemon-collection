import { Input } from "@/components/ui/input";

export function TradeQuantityInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">Quantidade</label>
      <Input id={id} type="number" min={1} max={2147483647} step={1} inputMode="numeric" required value={value} onChange={(event) => onChange(event.target.value)} className="w-24" />
    </div>
  );
}
