import { Input } from "@/components/ui/input";

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function PriceInput({ value, onChange }: PriceInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = event.target.value.replace(/[^\d,.]/g, "").replace(",", ".");

    if (!cleaned) {
      onChange("");
      return;
    }

    const [integerPart, ...decimalParts] = cleaned.split(".");
    const integer = integerPart.replace(/^0+(?=\d)/, "") || "0";
    const decimals = decimalParts.join("").slice(0, 2);

    onChange(cleaned.includes(".") ? `${integer}.${decimals}` : integer);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value.replace(".", ",")}
      onChange={handleChange}
      placeholder="Ex: 32"
      className="font-medium"
    />
  );
}
