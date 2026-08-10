import { CardCondition } from "@/types/collection-card";
import { cn } from "@/lib/utils";

interface ConditionSelectorProps {
  value: CardCondition;
  onChange: (value: CardCondition) => void;
}

const conditions: { id: CardCondition; label: string; desc: string; color: string }[] = [
  { id: "M", label: "M", desc: "Mint (lacrada)", color: "bg-teal-100 text-teal-800 border-teal-300" },
  { id: "NM", label: "NM", desc: "Near Mint", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { id: "SP", label: "SP", desc: "Slightly Played", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { id: "MP", label: "MP", desc: "Moderately Played", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { id: "HP", label: "HP", desc: "Heavily Played", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { id: "D", label: "D", desc: "Damaged", color: "bg-red-100 text-red-800 border-red-300" },
];

export function ConditionSelector({ value, onChange }: ConditionSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {conditions.map((cond) => {
        const isSelected = value === cond.id;
        
        return (
          <button
            key={cond.id}
            type="button"
            onClick={() => onChange(cond.id)}
            title={cond.desc}
            className={cn(
              "h-8 flex-1 rounded-md border px-2 py-1 text-xs font-semibold transition-all",
              isSelected
                ? `${cond.color} ring-2 ring-ring ring-offset-2`
                : "bg-background text-muted-foreground hover:bg-muted border-input"
            )}
          >
            {cond.label}
          </button>
        );
      })}
    </div>
  );
}
