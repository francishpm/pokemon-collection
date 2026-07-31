import React from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatCurrency";

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function PriceInput({ value, onChange }: PriceInputProps) {
  // Formata o valor apenas para exibição
  const displayValue = React.useMemo(() => {
    if (!value) return "";
    const numeric = Number(value);
    if (isNaN(numeric)) return "";
    return formatCurrency(numeric);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não for número (ex: R$, vírgulas, pontos e letras)
    const rawValue = e.target.value.replace(/\D/g, "");
    
    if (!rawValue) {
      onChange("");
      return;
    }

    // Divide por 100 para criar os centavos matematicamente
    const numericValue = Number(rawValue) / 100;
    
    // Devolve para o estado pai apenas o valor numérico limpo (como string)
    onChange(numericValue.toString());
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder="R$ 0,00"
      className="font-medium"
    />
  );
}